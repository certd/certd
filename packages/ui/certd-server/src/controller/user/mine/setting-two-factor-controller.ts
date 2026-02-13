import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { BaseController, Constants } from "@certd/lib-server";
import { UserSettingsService } from "../../../modules/mine/service/user-settings-service.js";
import { UserTwoFactorSetting } from "../../../modules/mine/service/models.js";
import { merge } from "lodash-es";
import { TwoFactorService } from "../../../modules/mine/service/two-factor-service.js";
import {isPlus} from "@certd/plus-core";

/**
 */
@Provide()
@Controller("/api/user/settings/twoFactor")
export class UserTwoFactorSettingController extends BaseController {
  @Inject()
  service: UserSettingsService;

  @Inject()
  twoFactorService: TwoFactorService;



  @Post("/get", { summary: Constants.per.authOnly })
  async get() {
    const userId = this.getUserId();
    const setting = await this.service.getSetting<UserTwoFactorSetting>(userId,null, UserTwoFactorSetting);
    return this.ok(setting);
  }

  @Post("/save", { summary: Constants.per.authOnly })
  async save(@Body(ALL) bean: any) {
    if (!isPlus()) {
      throw new Error('本功能需要开通专业版')
    }
    const userId = this.getUserId();
    const setting = new UserTwoFactorSetting();
    merge(setting, bean);

    // 禁用时清除
    if(!setting.authenticator.enabled){
        setting.authenticator.secret = null;
        setting.authenticator.verified = false;
    }

    await this.service.saveSetting(userId,null, setting);
    return this.ok({});
  }

  @Post("/authenticator/qrcode", { summary: Constants.per.authOnly })
  async authenticatorQrcode() {
    const userId = this.getUserId();
    const {qrcode,link,secret} = await this.twoFactorService.getAuthenticatorQrCode(userId);
    return this.ok({qrcode,link,secret}); 
  }

  @Post("/authenticator/save", { summary: Constants.per.authOnly })
  async authenticatorSave(@Body(ALL) bean: any) {
    if (!isPlus()) {
      throw new Error('本功能需要开通专业版')
    }
    const userId = this.getUserId();
    await this.twoFactorService.saveAuthenticator({
        userId,
        verifyCode: bean.verifyCode,
    });
    return this.ok();
  }

  @Post("/authenticator/off", { summary: Constants.per.authOnly })
  async authenticatorOff() {
    const userId = this.getUserId();
    await this.twoFactorService.offAuthenticator(userId);
    return this.ok();
  }

}
