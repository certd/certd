import { ALL, Body, Controller, Inject, Post, Provide, RequestIP } from "@midwayjs/core";
import { PasskeyService } from "../../../modules/login/service/passkey-service.js";
import { BaseController, Constants } from "@certd/lib-server";
import { UserService } from "../../../modules/sys/authority/service/user-service.js";
import { TwoFactorService } from "../../../modules/mine/service/two-factor-service.js";
import { ApiTags } from "@midwayjs/swagger";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";
import { cache, utils } from "@certd/basic";

@Provide()
@Controller("/api/mine/passkey")
@ApiTags(["mine"])
export class MinePasskeyController extends BaseController {
  @Inject()
  passkeyService: PasskeyService;

  @Inject()
  userService: UserService;

  @Inject()
  twoFactorService: TwoFactorService;

  getAuditType(): string {
    return AuditType.mine.value;
  }

  @Post("/generateRegistration", { description: Constants.per.authOnly, summary: "生成Passkey注册选项" })
  public async generateRegistration(
    @Body(ALL)
    body: any,
    @RequestIP()
    remoteIp: string
  ) {
    const userId = this.getUserId();
    await this.twoFactorService.assertAuthenticatorEnabled(userId);
    await this.twoFactorService.verifyAuthenticatorCode(userId, body.verifyCode);
    const user = await this.userService.info(userId);

    if (!user) {
      throw new Error("用户不存在");
    }

    const options = await this.passkeyService.generateRegistrationOptions(userId, user.username, remoteIp, this.ctx);
    const verifyToken = utils.id.simpleNanoId(32);
    cache.set(`passkey_registration_token:${verifyToken}`, userId, { ttl: 5 * 60 * 1000 });

    return this.ok({
      ...options,
      verifyToken,
    });
  }

  private consumeRegistrationToken(userId: number, verifyToken: string) {
    if (!verifyToken) {
      throw new Error("注册前必须完成TOTP 2FA验证");
    }
    const tokenUserId = cache.take(`passkey_registration_token:${verifyToken}`);
    if (tokenUserId == null || Number(tokenUserId) !== Number(userId)) {
      throw new Error("注册验证已过期，请重新完成TOTP 2FA验证");
    }
  }

  private async registerInternal(body: any) {
    const userId = this.getUserId();
    await this.twoFactorService.assertAuthenticatorEnabled(userId);
    this.consumeRegistrationToken(userId, body.verifyToken);
    const response = body.response;
    const challenge = body.challenge;
    const deviceName = body.deviceName;
    const result = await this.passkeyService.registerPasskey(userId, response, challenge, deviceName, this.ctx);
    this.auditLog({ content: `注册了Passkey ${deviceName || ""}`.trim() });
    return this.ok(result);
  }

  @Post("/verifyRegistration", { description: Constants.per.authOnly, summary: "验证Passkey注册" })
  public async verifyRegistration(
    @Body(ALL)
    body: any
  ) {
    return await this.registerInternal(body);
  }

  @Post("/register", { description: Constants.per.authOnly, summary: "注册Passkey" })
  public async registerPasskey(
    @Body(ALL)
    body: any
  ) {
    return await this.registerInternal(body);
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询Passkey列表" })
  public async getPasskeys() {
    const userId = this.getUserId();
    await this.passkeyService.autoDisableExpiredPasskeys(userId);
    const passkeys = await this.passkeyService.find({
      select: ["id", "deviceName", "registeredAt", "lastUsedAt", "disabled", "transports", "passkeyId", "rpId", "updateTime"],
      where: { userId },
      order: { registeredAt: "DESC" },
    });
    return this.ok(passkeys);
  }

  @Post("/unbind", { description: Constants.per.authOnly, summary: "解绑Passkey" })
  public async unbindPasskey(@Body(ALL) body: any) {
    const userId = this.getUserId();
    await this.twoFactorService.assertAuthenticatorEnabled(userId);
    await this.twoFactorService.verifyAuthenticatorCode(userId, body.verifyCode);
    const passkeyId = body.id;

    const passkey = await this.passkeyService.findOne({
      where: { id: passkeyId, userId },
    });

    if (!passkey) {
      throw new Error("Passkey不存在");
    }

    await this.passkeyService.delete([passkey.id]);
    this.auditLog({ content: `解绑了Passkey ${passkey.deviceName}` });
    return this.ok({});
  }

  @Post("/reactivate", { description: Constants.per.authOnly, summary: "TOTP验证后重新激活Passkey" })
  public async reactivatePasskey(@Body(ALL) body: any) {
    const userId = this.getUserId();
    await this.twoFactorService.assertAuthenticatorEnabled(userId);
    await this.twoFactorService.verifyAuthenticatorCode(userId, body.verifyCode);
    const result = await this.passkeyService.reactivatePasskey(userId, Number(body.id));
    this.auditLog({ content: `重新激活了Passkey(ID:${body.id})` });
    return this.ok(result);
  }
}
