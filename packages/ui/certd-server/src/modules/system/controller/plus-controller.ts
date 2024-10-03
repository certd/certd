import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { SysSettingsService } from '@certd/lib-server';
import { BaseController } from '@certd/lib-server';
import { AppKey } from '@certd/pipeline';
import { SysInstallInfo } from '@certd/lib-server';
import { logger } from '@certd/pipeline';
import { PlusService } from '@certd/lib-server';

/**
 */
@Provide()
@Controller('/api/sys/plus')
export class SysPlusController extends BaseController {
  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  plusService: PlusService;

  @Post('/active', { summary: 'sys:settings:edit' })
  async active(@Body(ALL) body) {
    const { code } = body;
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    const siteId = installInfo.siteId;
    const formData = {
      appKey: AppKey,
      code,
      subjectId: siteId,
    };

    const res: any = await this.plusService.active(formData);

    if (res.code > 0) {
      logger.error('激活失败', res.message);
      return this.fail(res.message, 1);
    }
    const license = res.data.license;

    await this.plusService.updateLicense(license);

    return this.ok(true);
  }
  @Post('/bindUrl', { summary: 'sys:settings:edit' })
  async bindUrl(@Body(ALL) body: { url: string }) {
    const { url } = body;

    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    await this.plusService.bindUrl(installInfo.siteId, url);

    installInfo.bindUrl = url;
    await this.sysSettingsService.saveSetting(installInfo);

    return this.ok(true);
  }
}
