import { Rule, RuleType } from '@midwayjs/validate';
import { ALL, Inject } from '@midwayjs/decorator';
import { Body } from '@midwayjs/decorator';
import { Controller, Post, Provide } from '@midwayjs/decorator';
import { BaseController } from '../../../basic/base-controller';
import { CodeService } from '../service/code-service';
import { EmailService } from '../service/email-service';
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

  @Post('/sendSmsCode')
  public sendSmsCode(
    @Body(ALL)
    body: SmsCodeReq
  ) {
    // 设置缓存内容
    return this.ok(null);
  }

  @Post('/captcha')
  public async getCaptcha(
    @Body()
    randomStr
  ) {
    console.assert(randomStr < 10, 'randomStr 过长');
    const captcha = await this.codeService.generateCaptcha(randomStr);
    return this.ok(captcha.data);
  }
}
