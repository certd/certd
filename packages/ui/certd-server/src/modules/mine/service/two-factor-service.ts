import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { UserSettingsService } from "./user-settings-service.js";
import { UserTwoFactorSetting } from "./models.js";
import { UserService } from "../../sys/authority/service/user-service.js";

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class TwoFactorService {
  @Inject()
  userSettingsService: UserSettingsService;
  @Inject()
  userService: UserService;


  async getAuthenticatorQrCode(userId: any) {
    const setting = await this.getSetting(userId)

    const authenticatorSetting = setting.authenticator;
    if (!authenticatorSetting.secret) {
      const { authenticator  } = await import("otplib");

      authenticatorSetting.secret = authenticator.generateSecret()
      await this.userSettingsService.saveSetting(userId, null, setting);
    }

    const user = await this.userService.info(userId);
    const username = user.username;
    const secret = authenticatorSetting.secret;
    const qrcodeContent = `otpauth://totp/Certd:${username}?secret=${secret}&issuer=Certd`;

    //生成qrcode base64
    const qrcode = await import("qrcode");
    const qrcodeBase64 = await qrcode.toDataURL(qrcodeContent);
    return {qrcode:qrcodeBase64,link:qrcodeContent,secret}

  }

  async saveAuthenticator(req: { userId: any; verifyCode: any }) {
    const userId = req.userId;
    const { authenticator } = await import("otplib");
    const setting = await this.getSetting(userId)

    const authenticatorSetting = setting.authenticator;
    if (!authenticatorSetting.secret) {
      throw new Error("secret is required");
    }
    const secret = authenticatorSetting.secret;
    const token = req.verifyCode;

    const isValid = authenticator.verify({ token, secret });
    if (!isValid) {
      throw new Error("authenticator 校验错误");
    }

    //校验成功，保存开启状态
    authenticatorSetting.enabled = true;
    authenticatorSetting.verified = true;

    await this.userSettingsService.saveSetting(userId, null, setting);
  }

  async offAuthenticator(userId:number) {
    if (!userId) {
      throw new Error("userId is required");
    }

    const setting = await this.getSetting(userId)
    setting.authenticator.enabled = false;
    setting.authenticator.verified = false;
    setting.authenticator.secret = '';
    await this.userSettingsService.saveSetting(userId, null, setting);
  }

  async getSetting(userId:number) {
    return await this.userSettingsService.getSetting<UserTwoFactorSetting>(userId, null, UserTwoFactorSetting);

  }

  async verifyAuthenticatorCode(userId: any, verifyCode: string) {
    const { authenticator } = await import("otplib");
    const setting = await this.getSetting(userId)
    if (!setting.authenticator.enabled) {
      throw new Error("authenticator 未开启");
    }
    if (!authenticator.verify({ token: verifyCode, secret: setting.authenticator.secret })) {
      throw new Error("验证码错误");
    }
    return true;
  }
}
