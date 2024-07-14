import { Rule, RuleType } from '@midwayjs/validate';
import { ALL, Inject } from '@midwayjs/core';
import { Body } from '@midwayjs/core';
import { Controller, Post, Provide } from '@midwayjs/core';
import { BaseController } from '../../../basic/base-controller.js';
import { CodeService } from '../service/code-service.js';
import { EmailService } from '../service/email-service.js';
import { Constants } from '../../../basic/constants.js';
export class SmsCodeReq {
  @Rule(RuleType.number().required())
  phoneCode: number;

  @Rule(RuleType.string().required())
  mobile: string;

  @Rule(RuleType.string().required().max(10))
  randomStr: string;

  @Rule(RuleType.number().required().max(4))
  imgCode: string;
}

/**
 */
@Provide()
@Controller('/api/basic/code')
export class BasicController extends BaseController {
  @Inject()
  codeService: CodeService;

  @Inject()
  emailService: EmailService;

  @Post('/sendSmsCode', { summary: Constants.per.guest })
  public sendSmsCode(
    @Body(ALL)
    body: SmsCodeReq
  ) {
    // 设置缓存内容
    return this.ok(null);
  }

  @Post('/captcha', { summary: Constants.per.guest })
  public async getCaptcha(
    @Body()
    randomStr
  ) {
    console.assert(randomStr < 10, 'randomStr 过长');
    const captcha = await this.codeService.generateCaptcha(randomStr);
    return this.ok(captcha.data);
  }
}
