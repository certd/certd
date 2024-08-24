import { Rule, RuleType } from '@midwayjs/validate';
import { Controller, Get, Inject, Provide } from '@midwayjs/core';
import { BaseController } from '../../../basic/base-controller.js';
import { Constants } from '../../../basic/constants.js';
import { SysSettingsService } from '../../system/service/sys-settings-service.js';
import { SysInstallInfo, SysPublicSettings } from '../../system/service/models.js';

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
    const settings = await this.sysSettingsService.getSetting(SysPublicSettings);
    return this.ok(settings);
  }

  @Get('/install', { summary: Constants.per.guest })
  public async getInstallInfo() {
    const settings = await this.sysSettingsService.getSetting(SysInstallInfo);
    return this.ok(settings);
  }
}
