import { Config, Controller, Get, Inject, Provide } from '@midwayjs/core';
import { BaseController, Constants, SysInstallInfo, SysPublicSettings, SysSettingsService, SysSiteEnv, SysSiteInfo } from '@certd/lib-server';
import { AppKey, getPlusInfo } from '@certd/pipeline';

/**
 */
@Provide()
@Controller('/api/basic/settings')
export class BasicSettingsController extends BaseController {
  @Inject()
  sysSettingsService: SysSettingsService;
  @Config('account.server.baseUrl')
  accountServerBaseUrl: any;

  @Config('agent')
  agentConfig: SysSiteEnv['agent'];

  public async getSysPublic() {
    return await this.sysSettingsService.getSetting(SysPublicSettings);
  }

  public async getInstallInfo() {
    const settings: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    settings.accountServerBaseUrl = this.accountServerBaseUrl;
    settings.appKey = AppKey;
    return settings;
  }

  public async getSiteInfo() {
    return await this.sysSettingsService.getSetting(SysSiteInfo);
  }

  public async getSiteEnv() {
    const env: SysSiteEnv = {
      agent: this.agentConfig,
    };
    return env;
  }

  async plusInfo() {
    return getPlusInfo();
  }

  @Get('/all', { summary: Constants.per.guest })
  async getAllSettings() {
    const sysPublic = await this.getSysPublic();
    const installInfo = await this.getInstallInfo();
    const siteInfo = await this.getSiteInfo();
    const siteEnv = await this.getSiteEnv();
    const plusInfo = await this.plusInfo();
    return this.ok({
      sysPublic,
      installInfo,
      siteInfo,
      siteEnv,
      plusInfo,
    });
  }
}
