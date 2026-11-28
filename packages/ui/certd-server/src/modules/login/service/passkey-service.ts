import { cache, logger } from "@certd/basic";
import { AuthException, BaseService, SysSettingsService, SysSiteInfo } from "@certd/lib-server";
import { isComm } from "@certd/plus-core";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { UserService } from "../../sys/authority/service/user-service.js";
import { PasskeyEntity } from "../entity/passkey.js";

const PASSKEY_UNUSED_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class PasskeyService extends BaseService<PasskeyEntity> {
  @Inject()
  userService: UserService;

  @InjectEntityModel(PasskeyEntity)
  repository: Repository<PasskeyEntity>;

  @Inject()
  sysSettingsService: SysSettingsService;

  getRepository(): Repository<PasskeyEntity> {
    return this.repository;
  }

  private resolveLastActiveAt(passkey: any): number {
    const updateTime = passkey.updateTime ? new Date(passkey.updateTime).getTime() : 0;
    return Number(passkey.lastActiveAt || passkey.lastUsedAt || updateTime || passkey.registeredAt || (passkey.createTime ? new Date(passkey.createTime).getTime() : 0)) || 0;
  }

  private isUnusedTooLong(passkey: any): boolean {
    const last = this.resolveLastActiveAt(passkey);
    return last > 0 && Date.now() - last > PASSKEY_UNUSED_TTL_MS;
  }

  /** 30天未使用的Passkey自动停用；需TOTP 2FA重新激活。 */
  async autoDisableExpiredPasskeys(userId: number) {
    const list = await this.find({ where: { userId, disabled: false } });
    const candidates = list.filter(item => this.isUnusedTooLong(item));
    // 条件更新：仅当记录仍停用可写且生命周期时间未被并发认证/激活推进时才停用
    for (const item of candidates) {
      const where: any = { id: item.id, disabled: false };
      const activeAt = Number(item.lastActiveAt);
      where.lastActiveAt = activeAt > 0 ? activeAt : IsNull();
      await this.repository.update(where, { disabled: true, updateTime: new Date() } as any);
    }
  }

  async getRpInfo(ctx: any) {
    let rpName = "Certd";
    if (isComm()) {
      const siteInfo = await this.sysSettingsService.getSetting<SysSiteInfo>(SysSiteInfo);
      rpName = siteInfo.title || rpName;
    }

    const origin = ctx.headers.origin || ctx.origin;
    const rpId = origin ? new URL(origin).hostname : ctx.hostname;

    return {
      rpName,
      rpId,
      origin,
    };
  }
  async generateRegistrationOptions(userId: number, username: string, remoteIp: string, ctx: any) {
    const { generateRegistrationOptions } = await import("@simplewebauthn/server");
    const user = await this.userService.info(userId);

    const { rpName, rpId } = await this.getRpInfo(ctx);

    const options = await generateRegistrationOptions({
      rpName: rpName,
      rpID: rpId,
      userID: new TextEncoder().encode(userId + ""),
      userName: username,
      userDisplayName: user.nickName || username,
      timeout: 60000,
      attestationType: "none",
      excludeCredentials: [],
      preferredAuthenticatorType: "localDevice",
      authenticatorSelection: {
        authenticatorAttachment: "cross-platform",
        userVerification: "preferred",
        residentKey: "preferred",
        requireResidentKey: false,
      },
    });
    logger.info("[passkey] 注册选项:", JSON.stringify(options));
    cache.set(`passkey:registration:${options.challenge}`, userId, {
      ttl: 5 * 60 * 1000,
    });

    return {
      ...options,
    };
  }

  async verifyRegistrationResponse(userId: number, response: any, challenge: string, ctx: any) {
    const storedUserId = cache.get(`passkey:registration:${challenge}`);
    if (!storedUserId) {
      throw new AuthException("注册验证已过期，请重新发起");
    }
    if (storedUserId !== userId) {
      throw new AuthException("注册验证失败");
    }
    const consumedUserId = cache.take(`passkey:registration:${challenge}`);
    if (consumedUserId == null || consumedUserId !== userId) {
      throw new AuthException("注册验证已过期，请重新发起");
    }

    const { rpId, origin } = await this.getRpInfo(ctx);
    const { verifyRegistrationResponse } = await import("@simplewebauthn/server");

    let verification: any = null;
    const verifyReq = {
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: false,
    };
    try {
      verification = await verifyRegistrationResponse(verifyReq);
    } catch (error) {
      // 后端验证时
      logger.error("[passkey] 注册验证失败:", JSON.stringify(verifyReq));
      throw new AuthException(`注册验证失败:${error.message || error}`);
    }
    if (!verification.verified) {
      throw new AuthException("注册验证失败");
    }

    // challenge已在上方原子take消费
    return {
      credentialId: verification.registrationInfo.credential.id,
      credentialPublicKey: verification.registrationInfo.credential.publicKey,
      counter: verification.registrationInfo.credential.counter,
    };
  }

  async generateAuthenticationOptions(
    ctx: any,
    opts: {
      userId?: number;
      purpose?: string;
      userVerification?: "required" | "preferred" | "discouraged";
    } = {}
  ) {
    const { rpId } = await this.getRpInfo(ctx);
    const { generateAuthenticationOptions } = await import("@simplewebauthn/server");

    const allowCredentials: any[] = [];
    if (opts.userId != null) {
      await this.autoDisableExpiredPasskeys(opts.userId);
      const passkeys = await this.find({
        select: ["passkeyId", "transports"],
        where: { userId: opts.userId, disabled: false },
      });
      for (const passkey of passkeys) {
        const credential: any = { id: passkey.passkeyId, type: "public-key" };
        if (passkey.transports) {
          credential.transports = JSON.parse(passkey.transports);
        }
        allowCredentials.push(credential);
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      timeout: 60000,
      allowCredentials,
      userVerification: opts.userVerification ?? "preferred", //'required' | 'preferred' | 'discouraged';
    });

    // challenge 必须绑定用户和用途，并一次性使用，防止跨场景重放
    cache.set(
      `passkey:authentication:${options.challenge}`,
      {
        userId: opts.userId ?? null,
        purpose: opts.purpose ?? "login",
      },
      {
        ttl: 2 * 60 * 1000,
      }
    );

    return {
      ...options,
    };
  }

  async verifyAuthenticationResponse(
    credential: any,
    challenge: string,
    ctx: any,
    opts: {
      expectedUserId?: number;
      purpose?: string;
      requireUserVerification?: boolean;
    } = {}
  ) {
    const challengeKey = `passkey:authentication:${challenge}`;
    const challengeData = cache.get(challengeKey);
    if (!challengeData) {
      throw new AuthException("Passkey验证已过期，请重试");
    }
    const purpose = opts.purpose ?? "login";
    if (challengeData.purpose !== purpose) {
      throw new AuthException("Passkey验证场景不匹配");
    }
    if (opts.expectedUserId != null && challengeData.userId !== opts.expectedUserId) {
      throw new AuthException("Passkey验证用户不匹配");
    }
    // 校验绑定关系后原子take：同一challenge在同一进程内最多被一个请求消费（不依赖先GET后DELETE）
    // 注意：当前cache为进程内LRU；多实例部署需共享缓存提供GETDEL/Lua等跨进程原子消费
    const consumed = cache.take(challengeKey);
    if (!consumed) {
      throw new AuthException("Passkey验证已过期，请重试");
    }
    if (consumed.purpose !== purpose || consumed.userId !== challengeData.userId) {
      throw new AuthException("Passkey验证场景或用户不匹配");
    }
    const passkey = await this.repository.findOne({
      where: {
        passkeyId: credential.id,
      },
    });

    if (!passkey) {
      throw new AuthException("Passkey不存在");
    }
    if (opts.expectedUserId != null && passkey.userId !== opts.expectedUserId) {
      throw new AuthException("Passkey不属于当前用户");
    }
    if (passkey.disabled) {
      throw new AuthException("Passkey已停用，请先通过TOTP 2FA验证重新激活");
    }
    if (this.isUnusedTooLong(passkey)) {
      const where: any = { id: passkey.id, disabled: false };
      const activeAt = Number(passkey.lastActiveAt);
      where.lastActiveAt = activeAt > 0 ? activeAt : IsNull();
      await this.repository.update(where, { disabled: true, updateTime: new Date() } as any);
      throw new AuthException("Passkey超过30天未使用已自动停用，请先通过TOTP 2FA验证重新激活");
    }

    const { rpId, origin } = await this.getRpInfo(ctx);

    if (passkey.rpId && passkey.rpId !== rpId) {
      throw new AuthException(`当前站点域名(${rpId})与Passkey注册域名(${passkey.rpId})不一致，请在${passkey.rpId}域名下使用该Passkey登录`);
    }

    const expectedRPID = passkey.rpId || rpId;
    const { verifyAuthenticationResponse } = await import("@simplewebauthn/server");

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID,
      requireUserVerification: opts.requireUserVerification ?? false,
      credential: {
        id: passkey.passkeyId,
        publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64")),
        counter: passkey.counter,
        transports: passkey.transports as any,
      },
    });

    if (!verification.verified) {
      throw new AuthException("认证验证失败");
    }

    await this.markAuthenticationSuccess(passkey, verification.authenticationInfo.newCounter, rpId);

    return {
      credentialId: verification.authenticationInfo.credentialID,
      counter: verification.authenticationInfo.newCounter,
      userId: passkey.userId,
    };
  }

  /** 认证成功的字段级条件更新：不覆盖disabled，且并发停用后fail-closed。 */
  private async markAuthenticationSuccess(passkey: PasskeyEntity, counter: number, rpId: string) {
    const now = Date.now();
    const update: any = {
      lastUsedAt: now,
      lastActiveAt: now,
      counter,
      updateTime: new Date(),
    };
    if (!passkey.rpId) {
      update.rpId = rpId;
    }
    const updated = await this.repository.update({ id: passkey.id, disabled: false }, update);
    if (!updated.affected) {
      throw new AuthException("Passkey已停用，本次认证已取消");
    }
  }

  async registerPasskey(userId: number, response: any, challenge: string, deviceName: string, ctx: any) {
    const verification = await this.verifyRegistrationResponse(userId, response, challenge, ctx);

    const rpInfo = await this.getRpInfo(ctx);
    const existing = await this.repository.findOne({ where: { passkeyId: verification.credentialId } });
    if (existing) {
      throw new AuthException("该Passkey已注册，请勿重复绑定");
    }
    const now = Date.now();
    try {
      await this.add({
        userId,
        passkeyId: verification.credentialId,
        publicKey: Buffer.from(verification.credentialPublicKey).toString("base64"),
        counter: verification.counter,
        deviceName,
        rpId: rpInfo.rpId,
        registeredAt: now,
        lastActiveAt: now,
        disabled: false,
      });
    } catch (e: any) {
      // 并发注册同一credential由唯一索引兜底，不留下不完整记录
      if (/UNIQUE|duplicate|unique constraint/i.test(String(e?.message || ""))) {
        throw new AuthException("该Passkey已注册，请勿重复绑定");
      }
      throw e;
    }

    return { success: true };
  }

  /** TOTP验证通过后重新激活已停用Passkey。 */
  async reactivatePasskey(userId: number, passkeyId: number) {
    const updated = await this.repository.update(
      { id: passkeyId, userId, disabled: true },
      { disabled: false, lastActiveAt: Date.now(), updateTime: new Date() } as any
    );
    if (!updated.affected) {
      throw new AuthException("Passkey不存在或当前状态不可激活");
    }
    return { success: true };
  }

  async loginByPasskey(credential: any, challenge: string, ctx: any) {
    const verification = await this.verifyAuthenticationResponse(credential, challenge, ctx);
    // verifyAuthenticationResponse已做字段级条件更新，避免这里用旧实体覆盖disabled/lastActiveAt
    const user = await this.userService.info(verification.userId);
    return user;
  }
}
