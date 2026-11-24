import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { BaseController, Constants } from "@certd/lib-server";
import { UserSettingsService } from "../../../modules/mine/service/user-settings-service.js";
import { UserTwoFactorSetting } from "../../../modules/mine/service/models.js";
import { merge } from "lodash-es";
import { TwoFactorService } from "../../../modules/mine/service/two-factor-service.js";
import { PasskeyService } from "../../../modules/login/service/passkey-service.js";
import { isPlus } from "@certd/plus-core";
import { ApiTags } from "@midwayjs/swagger";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";
import { cache, utils } from "@certd/basic";

/**
 */
@Provide()
@Controller("/api/user/settings/twoFactor")
@ApiTags(["mine"])
export class UserTwoFactorSettingController extends BaseController {
  @Inject()
  service: UserSettingsService;

  @Inject()
  twoFactorService: TwoFactorService;

  @Inject()
  passkeyService: PasskeyService;

  getAuditType(): string {
    return AuditType.mine.value;
  }

  private issueSecretAccessToken(userId: number) {
    const token = utils.id.simpleNanoId(32);
    cache.set(`secret_access_2fa:${token}`, userId, { ttl: 10 * 60 * 1000 });
    return token;
  }

  @Post("/get", { description: Constants.per.authOnly, summary: "获取双因子认证设置" })
  async get() {
    const userId = this.getUserId();
    const setting = await this.service.getSetting<UserTwoFactorSetting>(userId, null, UserTwoFactorSetting);
    return this.ok(setting);
  }

  @Post("/save", { description: Constants.per.authOnly, summary: "保存双因子认证设置" })
  async save(@Body(ALL) bean: any) {
    if (!isPlus()) {
      throw new Error("本功能需要开通Certd专业版");
    }
    const userId = this.getUserId();
    const setting = await this.service.getSetting<UserTwoFactorSetting>(userId, null, UserTwoFactorSetting);
    const { password, ...changes } = bean;
    const updated = merge(new UserTwoFactorSetting(), setting, changes);
    if ((setting.loginEnabled && !updated.loginEnabled) || (setting.authenticator.enabled && !updated.authenticator.enabled)) {
      await this.twoFactorService.verifyPassword(userId, password);
    }

    // 禁用时清除
    if (!updated.authenticator.enabled) {
      updated.authenticator.secret = null;
      updated.authenticator.verified = false;
    }

    await this.service.saveSetting(userId, null, updated);
    this.auditLog({ content: `保存了双因子认证设置 ${updated.authenticator.enabled ? "启用" : "禁用"}` });
    return this.ok({});
  }

  @Post("/authenticator/qrcode", { description: Constants.per.authOnly, summary: "获取验证器二维码" })
  async authenticatorQrcode() {
    const userId = this.getUserId();
    const { qrcode, link, secret } = await this.twoFactorService.getAuthenticatorQrCode(userId);
    return this.ok({ qrcode, link, secret });
  }

  @Post("/authenticator/save", { description: Constants.per.authOnly, summary: "保存验证器设置" })
  async authenticatorSave(@Body(ALL) bean: any) {
    if (!isPlus()) {
      throw new Error("本功能需要开通Certd专业版");
    }
    const userId = this.getUserId();
    await this.twoFactorService.saveAuthenticator({
      userId,
      verifyCode: bean.verifyCode,
    });
    this.auditLog({ content: `保存了验证器设置` });
    return this.ok();
  }

  @Post("/authenticator/off", { description: Constants.per.authOnly, summary: "关闭验证器" })
  async authenticatorOff(@Body("password") password?: string) {
    const userId = this.getUserId();
    await this.twoFactorService.verifyPassword(userId, password);
    await this.twoFactorService.offAuthenticator(userId);
    this.auditLog({ content: "关闭了验证器" });
    return this.ok();
  }

  @Post("/verifySecretAccess", { description: Constants.per.authOnly, summary: "验证查看加密密钥" })
  async verifySecretAccess(@Body(ALL) bean: { verifyCode: string }) {
    const userId = this.getUserId();
    await this.twoFactorService.verifyAuthenticatorCode(userId, bean.verifyCode);
    const token = this.issueSecretAccessToken(userId);
    return this.ok(token);
  }

  @Post("/passkey/generateAuthentication", { description: Constants.per.authOnly, summary: "生成查看密钥的Passkey验证选项" })
  async passkeyGenerateAuthentication() {
    const userId = this.getUserId();
    const passkeys = await this.passkeyService.find({
      select: ["id"],
      where: { userId },
    });
    if (passkeys.length === 0) {
      throw new Error("当前账号未注册 Passkey，请先在个人中心注册");
    }
    const options = await this.passkeyService.generateAuthenticationOptions(this.ctx, {
      userId,
      purpose: "secretAccess",
      userVerification: "required",
    });
    return this.ok(options);
  }

  @Post("/passkey/verifyAuthentication", { description: Constants.per.authOnly, summary: "Passkey验证查看加密密钥" })
  async passkeyVerifyAuthentication(@Body(ALL) bean: { credential: any; challenge: string }) {
    const userId = this.getUserId();
    await this.passkeyService.verifyAuthenticationResponse(bean.credential, bean.challenge, this.ctx, {
      expectedUserId: userId,
      purpose: "secretAccess",
      requireUserVerification: true,
    });
    const token = this.issueSecretAccessToken(userId);
    this.auditLog({ content: "通过 Passkey 验证查看加密密钥" });
    return this.ok(token);
  }
}
