import { Inject, Provide } from '@midwayjs/core';
import { CacheManager } from '@midwayjs/cache';
import svgCaptcha from 'svg-captcha';

// {data: '<svg.../svg>', text: 'abcd'}
/**
 */
@Provide()
export class CodeService {
  @Inject()
  cache: CacheManager; // 依赖注入CacheManager

  /**
   */
  async generateCaptcha(randomStr) {
    console.assert(randomStr < 10, 'randomStr 过长');
    const c = svgCaptcha.create();
    //{data: '<svg.../svg>', text: 'abcd'}
    const imgCode = c.text; // = RandomUtil.randomStr(4, true);
    await this.cache.set('imgCode:' + randomStr, imgCode, {
      ttl: 2 * 60 * 1000, //过期时间 2分钟
    });
    return c;
  }

  async getCaptchaText(randomStr) {
    return await this.cache.get('imgCode:' + randomStr);
  }

  async removeCaptcha(randomStr) {
    await this.cache.del('imgCode:' + randomStr);
  }

  async checkCaptcha(randomStr, userCaptcha) {
    const code = await this.getCaptchaText(randomStr);
    if (code == null) {
      throw new Error('验证码已过期');
    }
    if (code !== userCaptcha) {
      throw new Error('验证码不正确');
    }
    return true;
  }
  /**
   */
  async sendSms(phoneCode, mobile, smsCode) {
    console.assert(phoneCode != null && mobile != null, '手机号不能为空');
    console.assert(smsCode != null, '验证码不能为空');
  }

  /**
   * loginBySmsCode
   */
  async loginBySmsCode(user, smsCode) {
    console.assert(user.mobile != null, '手机号不能为空');
  }
}
