import { cache } from "@certd/basic";
import { AuthException, BaseService } from "@certd/lib-server";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { UserService } from "../../sys/authority/service/user-service.js";
import { PasskeyEntity } from "../entity/passkey.js";
import { Repository } from "typeorm";
import { InjectEntityModel } from "@midwayjs/typeorm";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class PasskeyService extends BaseService<PasskeyEntity> {
 
  @Inject()
  userService: UserService;

  @InjectEntityModel(PasskeyEntity)
  repository: Repository<PasskeyEntity>;

  getRepository(): Repository<PasskeyEntity> {
    return this.repository;
  }
  async generateRegistrationOptions(userId: number, username: string, remoteIp: string, ctx: any) {
    const { generateRegistrationOptions } = await import("@simplewebauthn/server");
    const user = await this.userService.info(userId);
    
    const options = await generateRegistrationOptions({
      rpName: "Certd",
      rpID: this.getRpId(ctx),
      userID: new Uint8Array([userId]),
      userName: username,
      userDisplayName: user.nickName || username,
      timeout: 60000,
      attestationType: "none",
      excludeCredentials: [],
    });

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

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.getOrigin(ctx),
      expectedRPID: this.getRpId(ctx),
    });

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
    const { generateAuthenticationOptions } = await import("@simplewebauthn/server");
    const options = await generateAuthenticationOptions({
      rpID: this.getRpId(ctx),
      timeout: 60000,
      allowCredentials: [],
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

    const verification = await verifyAuthenticationResponse({
      response:credential,
      expectedChallenge: challenge,
      expectedOrigin: this.getOrigin(ctx),
      expectedRPID: this.getRpId(ctx),
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

  async loginByPasskey( credential: any, challenge: string, ctx: any) {
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
    await this.repository.save(passkey);

    const user = await this.userService.info(passkey.userId);
    return user;
  }

  private getRpId(ctx: any): string {
    if (ctx && ctx.request && ctx.request.host) {
      return ctx.request.host.split(':')[0];
    }
    return 'localhost';
  }

  private getOrigin(ctx: any): string {
    if (ctx && ctx.request) {
      const protocol = ctx.request.protocol;
      const host = ctx.request.host;
      return `${protocol}://${host}`;
    }
    return 'https://localhost';
  }
}
