import { ALL, Body, Config, Controller, Get, Inject, Provide } from '@midwayjs/core';
import { BaseController, Constants, SysInstallInfo, SysPublicSettings, SysSettingsService, SysSiteInfo } from '@certd/lib-server';
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

  @Get('/public', { summary: Constants.per.guest })
  public async getSysPublic() {
    const settings = await this.sysSettingsService.getSetting(SysPublicSettings);
    return this.ok(settings);
  }

  @Get('/install', { summary: Constants.per.guest })
  public async getInstallInfo() {
    const settings: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    settings.accountServerBaseUrl = this.accountServerBaseUrl;
    settings.appKey = AppKey;
    return this.ok(settings);
  }

  @Get('/siteInfo', { summary: Constants.per.guest })
  public async getSiteInfo() {
    const settings: SysSiteInfo = await this.sysSettingsService.getSetting(SysSiteInfo);
    return this.ok(settings);
  }

  @Get('/plusInfo', { summary: Constants.per.guest })
  async plusInfo(@Body(ALL) body: any) {
    const info = getPlusInfo();
    return this.ok({
      ...info,
    });
  }
}
