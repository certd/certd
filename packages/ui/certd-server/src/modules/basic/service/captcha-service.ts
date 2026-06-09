import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { SysSettingsService } from "@certd/lib-server";
import { logger } from "@certd/basic";
import { CaptchaRequest, ICaptchaAddon } from "../../../plugins/plugin-captcha/api.js";
import { AddonGetterService } from "../../pipeline/service/addon-getter-service.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CaptchaService {
  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  addonGetterService: AddonGetterService;

  async getCaptcha(captchaAddonId?: number) {
    if (!captchaAddonId) {
      const settings = await this.sysSettingsService.getPublicSettings();
      captchaAddonId = settings.captchaAddonId ?? 0;
    }
    const addon: ICaptchaAddon = await this.addonGetterService.getAddonById(captchaAddonId, true, 0, null, {
      type: "captcha",
      name: "image",
    });
    if (!addon) {
      throw new Error("验证码插件还未配置");
    }
    return await addon.getCaptcha();
  }

  async doValidate(opts: { form: any; must?: boolean; captchaAddonId?: number; req: CaptchaRequest }) {
    if (!opts.captchaAddonId) {
      const settings = await this.sysSettingsService.getPublicSettings();
      opts.captchaAddonId = settings.captchaAddonId ?? 0;
    }
    const addon = await this.addonGetterService.getById(opts.captchaAddonId, 0);
    if (!addon) {
      if (opts.must) {
        throw new Error("请先配置验证码插件");
      }
      logger.warn("验证码插件还未配置，忽略验证码校验");
      return true;
    }

    if (!opts.form) {
      throw new Error("请输入验证码");
    }
    const res = await addon.onValidate(opts.form, opts.req);
    if (!res) {
      throw new Error("验证码错误");
    }

    return true;
  }
}
