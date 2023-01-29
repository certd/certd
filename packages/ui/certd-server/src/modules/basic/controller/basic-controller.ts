import { Rule, RuleType } from '@midwayjs/validate';
import { ALL, Inject } from '@midwayjs/decorator';
import { Body } from '@midwayjs/decorator';
import { Controller, Post, Provide } from '@midwayjs/decorator';
import { BaseController } from '../../../basic/base-controller';
import { CodeService } from '../service/code-service';
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

// const enumsMap = {};
// glob('src/modules/**/enums/*.ts', {}, (err, matches) => {
//   console.log('matched', matches);
//   for (const filePath of matches) {
//     const module = require('/' + filePath);
//     console.log('modules', module);
//   }
// });

/**
 */
@Provide()
@Controller('/api/basic')
export class BasicController extends BaseController {
  @Inject()
  codeService: CodeService;
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
