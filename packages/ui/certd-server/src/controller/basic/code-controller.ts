import { BaseController, Constants, SysSettingsService } from "@certd/lib-server";
import { ALL, Body, Controller, Inject, Post, Provide, Query, RequestIP } from "@midwayjs/core";
import { Rule, RuleType } from "@midwayjs/validate";
import { CaptchaService } from "../../modules/basic/service/captcha-service.js";
import { CodeService } from "../../modules/basic/service/code-service.js";
import { EmailService } from "../../modules/basic/service/email-service.js";
import { AddonGetterService } from "../../modules/pipeline/service/addon-getter-service.js";

export class SmsCodeReq {
  @Rule(RuleType.string().required())
  phoneCode: string;

  @Rule(RuleType.string().required())
  mobile: string;

  @Rule(RuleType.required())
  captcha: any;

  @Rule(RuleType.string())
  verificationType: string;
}

export class EmailCodeReq {
  @Rule(RuleType.string().required())
  email: string;

  @Rule(RuleType.required())
  captcha: any;

  @Rule(RuleType.string())
  verificationType: string;
}

// 找回密码的验证码有效期
const FORGOT_PASSWORD_CODE_DURATION = 3

/**
 */
@Provide()
@Controller('/api/basic/code')
export class BasicController extends BaseController {
  @Inject()
  codeService: CodeService;

  @Inject()
  emailService: EmailService;
  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  captchaService: CaptchaService;

  @Inject()
  addonGetterService: AddonGetterService;

  @Post('/captcha/get', { description: Constants.per.guest })
  async getCaptcha(@Query("captchaAddonId") captchaAddonId:number) {
      const form = await this.captchaService.getCaptcha(captchaAddonId)
      return this.ok(form);
  }

  @Post('/sendSmsCode', { description: Constants.per.guest })
  public async sendSmsCode(
    @Body(ALL)
    body: SmsCodeReq,
    @RequestIP() remoteIp: string
  ) {
    const opts = {
      verificationType: body.verificationType,
      verificationCodeLength: undefined,
      duration: undefined,
    };
    if(body?.verificationType === 'forgotPassword') {
      opts.duration = FORGOT_PASSWORD_CODE_DURATION;
      // opts.verificationCodeLength = 6; //部分厂商这里会设置参数长度这里就不改了
    }

    await this.codeService.checkCaptcha(body.captcha,{remoteIp});
    await this.codeService.sendSmsCode(body.phoneCode, body.mobile, opts);
    return this.ok(null);
  }

  @Post('/sendEmailCode', { description: Constants.per.guest })
  public async sendEmailCode(
    @Body(ALL)
    body: EmailCodeReq,
    @RequestIP() remoteIp: string
  ) {
    const opts = {
      verificationType: body.verificationType,
      verificationCodeLength: undefined,
      duration: undefined,
    };
    
    if(body?.verificationType === 'forgotPassword') {
      opts.duration = FORGOT_PASSWORD_CODE_DURATION;
      opts.verificationCodeLength = 6;
    }else{
      opts.duration = 10;
      opts.verificationCodeLength = 6;
    }


    await this.codeService.checkCaptcha(body.captcha,{remoteIp});
    await this.codeService.sendEmailCode(body.email, opts);
    // 设置缓存内容
    return this.ok(null);
  }

}
