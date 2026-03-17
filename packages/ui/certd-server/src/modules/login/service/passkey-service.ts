import { cache, logger } from "@certd/basic";
import { AuthException, BaseService, SysInstallInfo, SysSettingsService, SysSiteInfo } from "@certd/lib-server";
import { isComm } from "@certd/plus-core";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { UserService } from "../../sys/authority/service/user-service.js";
import { PasskeyEntity } from "../entity/passkey.js";

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

  async getRpInfo() {
    let rpName = "Certd"
    if (isComm()) {
      const siteInfo = await this.sysSettingsService.getSetting<SysSiteInfo>(SysSiteInfo);
      rpName = siteInfo.title || rpName;
    }

    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);

    const url = installInfo.bindUrl || "http://localhost:7001";
    const uri = new URL(url);
    const rpId = uri.hostname;
    const origin = uri.origin;

    return {
      rpName,
      rpId,
      origin,
    }
  }
  async generateRegistrationOptions(userId: number, username: string, remoteIp: string, ctx: any) {
    const { generateRegistrationOptions } = await import("@simplewebauthn/server");
    const user = await this.userService.info(userId);

    const { rpName, rpId } = await this.getRpInfo();


    const options = await generateRegistrationOptions({
      rpName: rpName,
      rpID: rpId,
      userID: new TextEncoder().encode(userId + ""),
      userName: username,
      userDisplayName: user.nickName || username,
      timeout: 60000,
      attestationType: "none",
      excludeCredentials: [],
      preferredAuthenticatorType: 'localDevice',
      authenticatorSelection: {
        authenticatorAttachment: "cross-platform", 
        userVerification: "preferred",      
        residentKey: "preferred",
        requireResidentKey: false
      },
    });
    logger.info('[passkey] 注册选项:', JSON.stringify(options));
    cache.set(`passkey:registration:${options.challenge}`, userId, {
      ttl: 5 * 60 * 1000,
    });

    return {
      ...options,
    };
  }

  async verifyRegistrationResponse(
    userId: number,
    response: any,
    challenge: string,
    ctx: any
  ) {
    const { verifyRegistrationResponse } = await import("@simplewebauthn/server");

    const storedUserId = cache.get(`passkey:registration:${challenge}`);
    if (!storedUserId || storedUserId !== userId) {
      throw new AuthException("注册验证失败");
    }

    const { rpId, origin } = await this.getRpInfo();

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
      logger.error('[passkey] 注册验证失败:', JSON.stringify(verifyReq));
      throw new AuthException(`注册验证失败:${error.message || error}`);
    }
    if (!verification.verified) {
      throw new AuthException("注册验证失败");
    }
    

    cache.delete(`passkey:registration:${challenge}`);

    return {
      credentialId: verification.registrationInfo.credential.id,
      credentialPublicKey: verification.registrationInfo.credential.publicKey,
      counter: verification.registrationInfo.credential.counter,
    };
  }

  async generateAuthenticationOptions(ctx: any) {
    const { rpId } = await this.getRpInfo();
    const { generateAuthenticationOptions } = await import("@simplewebauthn/server");
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      timeout: 60000,
      allowCredentials: [],
      userVerification: 'preferred' //'required' | 'preferred' | 'discouraged';
    });

    // cache.set(`passkey:authentication:${options.challenge}`, userId, {
    //   ttl: 5 * 60 * 1000,
    // });

    return {
      ...options,
    };
  }

  async verifyAuthenticationResponse(
    credential: any,
    challenge: string,
    ctx: any
  ) {
    const { verifyAuthenticationResponse } = await import("@simplewebauthn/server");

    const passkey = await this.repository.findOne({
      where: {
        passkeyId: credential.id,
      },
    });

    if (!passkey) {
      throw new AuthException("Passkey不存在");
    }

    const { rpId, origin } = await this.getRpInfo();

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: false,
      credential: {
        id: passkey.passkeyId,
        publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64')),
        counter: passkey.counter,
        transports: passkey.transports as any,
      },
    });

    if (!verification.verified) {
      throw new AuthException("认证验证失败");
    }

    cache.delete(`passkey:authentication:${challenge}`);

    return {
      credentialId: verification.authenticationInfo.credentialID,
      counter: verification.authenticationInfo.newCounter,
      userId: passkey.userId,
    };
  }

  async registerPasskey(
    userId: number,
    response: any,
    challenge: string,
    deviceName: string,
    ctx: any
  ) {
    const verification = await this.verifyRegistrationResponse(
      userId,
      response,
      challenge,
      ctx
    );

    await this.add({
      userId,
      passkeyId: verification.credentialId,
      publicKey: Buffer.from(verification.credentialPublicKey).toString('base64'),
      counter: verification.counter,
      deviceName,
      registeredAt: Date.now(),
    });

    return { success: true };
  }

  async loginByPasskey(credential: any, challenge: string, ctx: any) {
    const verification = await this.verifyAuthenticationResponse(
      credential,
      challenge,
      ctx
    );

    const passkey = await this.repository.findOne({
      where: {
        passkeyId: verification.credentialId,
      },
    });

    if (!passkey) {
      throw new AuthException("Passkey不存在");
    }

    if (verification.counter <= passkey.counter) {
      throw new AuthException("认证失败:计数器异常");
    }

    passkey.counter = verification.counter;
    passkey.updateTime = new Date();
    await this.repository.save(passkey);

    const user = await this.userService.info(passkey.userId);
    return user;
  }

  // private getRpId(ctx: any): string {
  //   if (ctx && ctx.request && ctx.request.host) {
  //     return ctx.request.host.split(':')[0];
  //   }
  //   return 'localhost';
  // }

  // private getOrigin(ctx: any): string {
  //   if (ctx && ctx.request) {
  //     const protocol = ctx.request.protocol;
  //     const host = ctx.request.host;
  //     return `${protocol}://${host}`;
  //   }
  //   return 'https://localhost';
  // }
}
