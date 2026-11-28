import { importRuntime } from "@certd/pipeline";
import { cache } from "@certd/basic";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { UserSettingsService } from "./user-settings-service.js";
import { UserTwoFactorSetting } from "./models.js";
import { UserService } from "../../sys/authority/service/user-service.js";

const TFA_FAIL_WINDOW_MS = 5 * 60 * 1000;
const TFA_MAX_FAILURES = 5;
const TFA_LOCK_MS = 15 * 60 * 1000;
const TFA_USED_CODE_TTL_MS = 90 * 1000;

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
    const setting = await this.getSetting(userId);

    const authenticatorSetting = setting.authenticator;
    if (!authenticatorSetting.secret) {
      const { authenticator } = await importRuntime("otplib");

      authenticatorSetting.secret = authenticator.generateSecret();
      await this.userSettingsService.saveSetting(userId, null, setting);
    }

    const user = await this.userService.info(userId);
    const username = user.username;
    const secret = authenticatorSetting.secret;
    const qrcodeContent = `otpauth://totp/Certd:${username}?secret=${secret}&issuer=Certd`;

    //生成qrcode base64
    const qrcode = await import("qrcode");
    const qrcodeBase64 = await qrcode.toDataURL(qrcodeContent);
    return { qrcode: qrcodeBase64, link: qrcodeContent, secret };
  }

  async assertAuthenticatorEnabled(userId: number) {
    const setting = await this.getSetting(userId);
    if (!setting.authenticator.enabled || !setting.authenticator.verified || !setting.authenticator.secret) {
      throw new Error("请先开启并验证TOTP 2FA");
    }
  }

  private async verifyTokenWithGuard(userId: number, token: string, secret: string, requireEnabled: boolean, setting: any) {
    const lockKey = `two_factor_lock:${userId}`;
    const lockUntil = cache.get(lockKey);
    if (lockUntil && Number(lockUntil) > Date.now()) {
      throw new Error("验证失败次数过多，请15分钟后再试");
    }
    if (requireEnabled && !setting.authenticator.enabled) {
      throw new Error("authenticator 未开启");
    }
    // TOTP时间步防重放：按用户+验证码原子占位，同一进程内并发提交最多一个成功
    const usedKey = `two_factor_used_code:${userId}:${String(token)}`;
    if (cache.has(usedKey)) {
      throw new Error("验证码已使用，请等待下一个验证码");
    }
    const { authenticator } = await importRuntime("otplib");
    const isValid = authenticator.verify({ token, secret });
    if (!isValid) {
      // 并发失败计数使用同步原子自增，避免丢失计数绕过锁定
      const failKey = `two_factor_fail:${userId}`;
      const failures = cache.increment(failKey, { ttl: TFA_FAIL_WINDOW_MS });
      if (failures >= TFA_MAX_FAILURES) {
        cache.set(lockKey, Date.now() + TFA_LOCK_MS, { ttl: TFA_LOCK_MS });
        cache.delete(failKey);
        throw new Error("验证失败次数过多，请15分钟后再试");
      }
      throw new Error("验证码错误");
    }
    if (!cache.setIfAbsent(usedKey, true, { ttl: TFA_USED_CODE_TTL_MS })) {
      throw new Error("验证码已使用，请等待下一个验证码");
    }
    cache.delete(`two_factor_fail:${userId}`);
    return true;
  }

  async saveAuthenticator(req: { userId: any; verifyCode: any }) {
    const userId = req.userId;
    const setting = await this.getSetting(userId);

    const authenticatorSetting = setting.authenticator;
    if (!authenticatorSetting.secret) {
      throw new Error("secret is required");
    }
    const secret = authenticatorSetting.secret;
    const token = req.verifyCode;

    await this.verifyTokenWithGuard(userId, token, secret, false, setting);

    //校验成功，保存开启状态
    authenticatorSetting.enabled = true;
    authenticatorSetting.verified = true;

    await this.userSettingsService.saveSetting(userId, null, setting);
  }

  async verifyPassword(userId: number, password: unknown) {
    if (typeof password !== "string" || !password) {
      throw new Error("请输入登录密码");
    }
    const user = await this.userService.info(userId);
    if (!user?.password || !(await this.userService.checkPassword(password, user.password, user.passwordVersion))) {
      throw new Error("登录密码错误");
    }
  }

  async offAuthenticator(userId: number) {
    if (!userId || userId <= 0) {
      throw new Error("userId is required");
    }

    const setting = await this.getSetting(userId);
    setting.authenticator.enabled = false;
    setting.authenticator.verified = false;
    setting.authenticator.secret = "";
    await this.userSettingsService.saveSetting(userId, null, setting);
  }

  async getSetting(userId: number) {
    return await this.userSettingsService.getSetting<UserTwoFactorSetting>(userId, null, UserTwoFactorSetting);
  }

  async verifyAuthenticatorCode(userId: any, verifyCode: string) {
    const setting = await this.getSetting(userId);
    if (!setting.authenticator.secret) {
      throw new Error("authenticator 未开启");
    }
    return await this.verifyTokenWithGuard(userId, verifyCode, setting.authenticator.secret, true, setting);
  }
}
