import { cache, isDev, randomNumber, simpleNanoId } from "@certd/basic";
import { AccessService, AccessSysGetter, CodeErrorException, SysSettingsService } from "@certd/lib-server";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { ISmsService } from "../sms/api.js";
import { SmsServiceFactory } from "../sms/factory.js";
import { CaptchaService } from "./captcha-service.js";
import { EmailService } from "./email-service.js";
import { CaptchaRequest } from "../../../plugins/plugin-captcha/api.js";

// {data: '<svg.../svg>', text: 'abcd'}
/**
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CodeService {
  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  emailService: EmailService;

  @Inject()
  accessService: AccessService;

  @Inject()
  captchaService: CaptchaService;

  async checkCaptcha(body: any, req: CaptchaRequest) {
    return await this.captchaService.doValidate({ form: body, req });
  }
  /**
   */
  async sendSmsCode(
    phoneCode = "86",
    mobile: string,
    opts?: {
      duration?: number;
      verificationType?: string;
      verificationCodeLength?: number;
    }
  ) {
    if (!mobile) {
      throw new Error("手机号不能为空");
    }

    const verificationCodeLength = Math.floor(Math.max(Math.min(opts?.verificationCodeLength || 4, 8), 4));
    const duration = Math.floor(Math.max(Math.min(opts?.duration || 5, 15), 1));

    const sysSettings = await this.sysSettingsService.getPrivateSettings();
    if (!sysSettings.sms?.config?.accessId) {
      throw new Error("当前站点还未配置短信");
    }
    const smsType = sysSettings.sms.type;
    const smsConfig = sysSettings.sms.config;
    const sender: ISmsService = await SmsServiceFactory.createSmsService(smsType);
    const accessGetter = new AccessSysGetter(this.accessService);
    sender.setCtx({
      accessService: accessGetter,
      config: smsConfig,
    });
    const smsCode = randomNumber(verificationCodeLength);
    await sender.sendSmsCode({
      mobile,
      code: smsCode,
      phoneCode,
    });

    const key = this.buildSmsCodeKey(phoneCode, mobile, opts?.verificationType);
    cache.set(key, smsCode, {
      ttl: duration * 60 * 1000, //5分钟
    });
    return smsCode;
  }

  /**
   *
   * @param email 收件邮箱
   * @param opts title标题 content内容模版 duration有效时间单位分钟 verificationType验证类型
   */
  async sendEmailCode(
    email: string,
    opts?: {
      duration?: number;
      verificationType?: string;
      verificationCodeLength?: number;
    }
  ) {
    if (!email) {
      throw new Error("Email不能为空");
    }

    const verificationCodeLength = Math.floor(Math.max(Math.min(opts?.verificationCodeLength || 4, 8), 4));
    const duration = Math.floor(Math.max(Math.min(opts?.duration || 5, 15), 1));

    const code = randomNumber(verificationCodeLength);

    const templateData = {
      code,
      duration,
      title: "验证码",
      content: `您的验证码是${code}，请勿泄露`,
      notificationType: "registerCode",
    };
    if (opts?.verificationType === "forgotPassword") {
      templateData.title = "找回密码";
      templateData.notificationType = "forgotPassword";
    }
    await this.emailService.sendByTemplate({
      type: templateData.notificationType,
      data: templateData,
      receivers: [email],
    });

    const key = this.buildEmailCodeKey(email, opts?.verificationType);
    cache.set(key, code, {
      ttl: duration * 60 * 1000, //5分钟
    });
    return code;
  }

  /**
   * checkSms
   */
  async checkSmsCode(opts: { mobile: string; phoneCode: string; smsCode: string; verificationType?: string; throwError: boolean; maxErrorCount?: number }) {
    const key = this.buildSmsCodeKey(opts.phoneCode, opts.mobile, opts.verificationType);
    return this.checkValidateCode("sms", key, opts.smsCode, opts.throwError, opts.maxErrorCount);
  }

  buildSmsCodeKey(phoneCode: string, mobile: string, verificationType?: string) {
    return ["sms", verificationType, phoneCode, mobile].filter(item => !!item).join(":");
  }

  buildEmailCodeKey(email: string, verificationType?: string) {
    return ["email", verificationType, email].filter(item => !!item).join(":");
  }
  checkValidateCode(type: string, key: string, userCode: string, throwError = true, maxErrorCount = 3) {
    // 记录异常次数key
    if (isDev() && userCode === "1234567") {
      return true;
    }
    const err_num_key = key + ":err_num";
    //验证邮件验证码
    const code = cache.get(key);
    if (code == null || code !== userCode) {
      let maxRetryCount = false;
      if (!!code && maxErrorCount > 0) {
        const err_num = cache.get(err_num_key) || 0;
        if (err_num >= maxErrorCount - 1) {
          maxRetryCount = true;
          cache.delete(key);
          cache.delete(err_num_key);
        } else {
          cache.set(err_num_key, err_num + 1, {
            ttl: 30 * 60 * 1000,
          });
        }
      }
      if (throwError) {
        const label = type === "sms" ? "手机" : "邮箱";
        throw new CodeErrorException(!maxRetryCount ? `${label}验证码错误` : `${label}验证码错误请获取新的验证码`);
      }
      return false;
    }
    cache.delete(key);
    cache.delete(err_num_key);
    return true;
  }

  checkEmailCode(opts: { validateCode: string; email: string; verificationType?: string; throwError: boolean; maxErrorCount?: number }) {
    const key = this.buildEmailCodeKey(opts.email, opts.verificationType);
    return this.checkValidateCode("email", key, opts.validateCode, opts.throwError, opts.maxErrorCount);
  }

  compile(templateString: string) {
    return new Function(
      "data",
      `    with(data || {}) {
        return \`${templateString}\`;
      }
    `
    );
  }

  buildValidationValueKey(code: string) {
    return `validationValue:${code}`;
  }
  setValidationValue(value: any) {
    const randomCode = simpleNanoId(12);
    const key = this.buildValidationValueKey(randomCode);
    cache.set(key, value, {
      ttl: 5 * 60 * 1000, //5分钟
    });
    return randomCode;
  }
  getValidationValue(code: string) {
    return cache.get(this.buildValidationValueKey(code));
  }
}
