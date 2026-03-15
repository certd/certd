import { ALL, Body, Controller, Inject, Post, Provide, RequestIP } from "@midwayjs/core";
import { LoginService } from "../../../modules/login/service/login-service.js";
import { AddonService, BaseController, Constants, SysPublicSettings, SysSettingsService } from "@certd/lib-server";
import { CodeService } from "../../../modules/basic/service/code-service.js";
import { checkComm } from "@certd/plus-core";
import { CaptchaService } from "../../../modules/basic/service/captcha-service.js";
import { PasskeyService } from "../../../modules/login/service/passkey-service.js";

/**
 */
@Provide()
@Controller('/api/')
export class LoginController extends BaseController {
  @Inject()
  loginService: LoginService;
  @Inject()
  codeService: CodeService;

  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  addonService: AddonService;

  @Inject()
  captchaService: CaptchaService;

   @Inject()
  passkeyService: PasskeyService;


  @Post('/login', { description: Constants.per.guest })
  public async login(
    @Body(ALL)
    body: any,
    @RequestIP()
    remoteIp: string
  ) {
   const settings = await this.sysSettingsService.getPublicSettings()
    if (settings.captchaEnabled === true) {
      await this.captchaService.doValidate({form:body.captcha,must:false,captchaAddonId:settings.captchaAddonId,req:{remoteIp}})
    }
    const token = await this.loginService.loginByPassword(body);
    this.writeTokenCookie(token);
    return this.ok(token);
  }

  private writeTokenCookie(token: { expire: any; token: any }) {
    // this.loginService.writeTokenCookie(this.ctx,token);
  }

  @Post('/loginBySms', { description: Constants.per.guest })
  public async loginBySms(
    @Body(ALL)
    body: any
  ) {
    const settings = await this.sysSettingsService.getSetting<SysPublicSettings>(SysPublicSettings);
    if (settings.smsLoginEnabled !== true) {
      throw new Error('当前站点禁止短信验证码登录');
    }
    checkComm();

    const token = await this.loginService.loginBySmsCode({
      phoneCode: body.phoneCode,
      mobile: body.mobile,
      smsCode: body.smsCode,
      randomStr: body.randomStr,
    });

    this.writeTokenCookie(token);

    return this.ok(token);
  }

  @Post('/loginByTwoFactor', { description: Constants.per.guest })
  public async loginByTwoFactor(
    @Body(ALL)
    body: any
  ) {

    const token = await this.loginService.loginByTwoFactor({
      loginId: body.loginId,
      verifyCode: body.verifyCode,
    });

    this.writeTokenCookie(token);
    return this.ok(token);
  }



  
  @Post('/passkey/generateAuthentication', { description: Constants.per.guest })
  public async generateAuthentication() {
    const options = await this.passkeyService.generateAuthenticationOptions(
      this.ctx
    );

    return this.ok({
      ...options,
    });
  }

  @Post('/loginByPasskey', { description: Constants.per.guest })
  public async loginByPasskey(
    @Body(ALL)
    body: any
  ) {
    const credential = body.credential;
    const challenge = body.challenge;

    const token = await this.loginService.loginByPasskey({
      credential,
      challenge,
    }, this.ctx);

    // this.writeTokenCookie(token);
    return this.ok(token);
  }

  @Post('/logout', { description: Constants.per.authOnly })
  public logout() {
    this.ctx.cookies.set("certd_token", "", {
      maxAge: 0
    });
    return this.ok();
  }
}
