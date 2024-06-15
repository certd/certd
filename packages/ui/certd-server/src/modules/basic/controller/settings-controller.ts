import { Rule, RuleType } from '@midwayjs/validate';
import { Controller, Get, Inject, Provide } from '@midwayjs/decorator';
import { BaseController } from '../../../basic/base-controller';
import { Constants } from '../../../basic/constants';
import { SysSettingsService } from '../../system/service/sys-settings-service';

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
@Controller('/api/basic/settings')
export class BasicSettingsController extends BaseController {
  @Inject()
  sysSettingsService: SysSettingsService;

  @Get('/public', { summary: Constants.per.guest })
  public async getSysPublic() {
    const settings = await this.sysSettingsService.readPublicSettings();
    return this.ok(settings);
  }
}
