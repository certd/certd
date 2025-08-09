import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { cache, isDev, randomNumber } from '@certd/basic';
import { SysSettingsService, SysSiteInfo } from '@certd/lib-server';
import { SmsServiceFactory } from '../sms/factory.js';
import { ISmsService } from '../sms/api.js';
import { CodeErrorException } from '@certd/lib-server/dist/basic/exception/code-error-exception.js';
import { EmailService } from './email-service.js';
import { AccessService } from '@certd/lib-server';
import { AccessSysGetter } from '@certd/lib-server';
import { isComm } from '@certd/plus-core';

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

  /**
   */
  async generateCaptcha(randomStr) {
    const svgCaptcha = await import('svg-captcha');
    const c = svgCaptcha.create();
    //{data: '<svg.../svg>', text: 'abcd'}
    const imgCode = c.text; // = RandomUtil.randomStr(4, true);
    cache.set('imgCode:' + randomStr, imgCode, {
      ttl: 2 * 60 * 1000, //过期时间 2分钟
    });
    return c;
  }

  async getCaptchaText(randomStr) {
    return cache.get('imgCode:' + randomStr);
  }

  async removeCaptcha(randomStr) {
    cache.delete('imgCode:' + randomStr);
  }

  async checkCaptcha(randomStr: string, userCaptcha: string) {
    const code = await this.getCaptchaText(randomStr);
    if (code == null) {
      throw new Error('验证码已过期');
    }
    if (code.toLowerCase() !== userCaptcha.toLowerCase()) {
      throw new Error('验证码不正确');
    }
    await this.removeCaptcha(randomStr);
    return true;
  }
  /**
   */
  async sendSmsCode(
    phoneCode = '86',
    mobile: string,
    randomStr: string,
    opts?: {
      duration?: number,
      verificationType?: string,
      verificationCodeLength?: number,
    },
  ) {
    if (!mobile) {
      throw new Error('手机号不能为空');
    }
    if (!randomStr) {
      throw new Error('randomStr不能为空');
    }

    const verificationCodeLength =  Math.floor(Math.max(Math.min(opts?.verificationCodeLength || 4, 8), 4));
    const duration = Math.floor(Math.max(Math.min(opts?.duration || 5, 15), 1));

    const sysSettings = await this.sysSettingsService.getPrivateSettings();
    if (!sysSettings.sms?.config?.accessId) {
      throw new Error('当前站点还未配置短信');
    }
    const smsType = sysSettings.sms.type;
    const smsConfig = sysSettings.sms.config;
    const sender: ISmsService = SmsServiceFactory.createSmsService(smsType);
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

    const key = this.buildSmsCodeKey(phoneCode, mobile, randomStr, opts?.verificationType);
    cache.set(key, smsCode, {
      ttl: duration * 60 * 1000, //5分钟
    });
    return smsCode;
  }

  /**
   *
   * @param email 收件邮箱
   * @param randomStr
   * @param opts title标题 content内容模版 duration有效时间单位分钟 verificationType验证类型
   */
  async sendEmailCode(
    email: string,
    randomStr: string,
    opts?: {
      title?: string,
      content?: string,
      duration?: number,
      verificationType?: string,
      verificationCodeLength?: number,
    },
  ) {
    if (!email) {
      throw new Error('Email不能为空');
    }
    if (!randomStr) {
      throw new Error('randomStr不能为空');
    }

    let siteTitle = 'Certd';
    if (isComm()) {
      const siteInfo = await this.sysSettingsService.getSetting<SysSiteInfo>(SysSiteInfo);
      if (siteInfo) {
        siteTitle = siteInfo.title || siteTitle;
      }
    }

    const verificationCodeLength =  Math.floor(Math.max(Math.min(opts?.verificationCodeLength || 4, 8), 4));
    const duration = Math.floor(Math.max(Math.min(opts?.duration || 5, 15), 1));

    const code = randomNumber(verificationCodeLength);

    const title = `【${siteTitle}】${!!opts?.title ? opts.title : '验证码'}`;
    const content = !!opts.content ? this.compile(opts.content)({code, duration}) : `您的验证码是${code}，请勿泄露`;

    await this.emailService.send({
      subject: title,
      content: content,
      receivers: [email],
    });

    const key = this.buildEmailCodeKey(email, randomStr, opts?.verificationType);
    cache.set(key, code, {
      ttl: duration * 60 * 1000, //5分钟
    });
    return code;
  }

  /**
   * checkSms
   */
  async checkSmsCode(opts: { mobile: string; phoneCode: string; smsCode: string; randomStr: string; verificationType?: string; throwError: boolean; errorNum?: number }) {
    const key = this.buildSmsCodeKey(opts.phoneCode, opts.mobile, opts.randomStr, opts.verificationType);
    if (isDev()) {
      return true;
    }
    return this.checkValidateCode(key, opts.smsCode, opts.throwError, opts.errorNum);
  }

  buildSmsCodeKey(phoneCode: string, mobile: string, randomStr: string, verificationType?: string) {
    return ['sms', verificationType, phoneCode, mobile, randomStr].filter(item => !!item).join(':');
  }

  buildEmailCodeKey(email: string, randomStr: string, verificationType?: string) {
    return ['email', verificationType, email, randomStr].filter(item => !!item).join(':');
  }
  checkValidateCode(key: string, userCode: string, throwError = true, errorNum = 0) {
    // 记录异常次数key
    const err_num_key = key + ':err_num';
    //验证图片验证码
    const code = cache.get(key);
    if (code == null || code !== userCode) {
      let maxRetryCount = false;
      if (!!code && errorNum > 0) {
        const err_num = cache.get(err_num_key) || 0
        if(err_num >= errorNum - 1) {
          maxRetryCount = true;
          cache.delete(key);
          cache.delete(err_num_key);
        } else {
          cache.set(err_num_key, err_num + 1, {
            ttl: 30 * 60 * 1000
          });
        }
      }
      if (throwError) {
        throw new CodeErrorException(!maxRetryCount ? '验证码错误': '验证码错误请获取新的验证码');
      }
      return false;
    }
    cache.delete(key);
    cache.delete(err_num_key);
    return true;
  }

  checkEmailCode(opts: { randomStr: string; validateCode: string; email: string; verificationType?: string; throwError: boolean; errorNum?: number }) {
    const key = this.buildEmailCodeKey(opts.email, opts.randomStr, opts.verificationType);
    return this.checkValidateCode(key, opts.validateCode, opts.throwError, opts.errorNum);
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
}
