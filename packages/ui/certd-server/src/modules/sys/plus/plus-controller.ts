import { ALL, Body, Controller, Get, Inject, Post, Provide } from '@midwayjs/core';
import { Constants, SysSettingsService } from '@certd/lib-server';
import { BaseController } from '@certd/lib-server';
import { AppKey, http, PlusRequestService, verify } from '@certd/pipeline';
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

    //重新验证配置
    await this.plusService.verify();

    return this.ok(true);
  }

  @Get('/test', { summary: Constants.per.guest })
  async test() {
    const subjectId = 'vpyoZb6fDBjzzSZp67OBP';
    const license = '';
    const timestamps = 1728365013899;
    const bindUrl = 'http://89.21.0.171:7001/';
    const service = new PlusRequestService({
      logger: logger,
      http: http,
      subjectId: subjectId,
      plusServerBaseUrls: ['https://api.ai.handsfree.work'],
    });
    const body = { subjectId, appKey: 'kQth6FHM71IPV3qdWc', url: bindUrl };

    async function test() {
      await verify({
        subjectId: subjectId,
        license: license,
        plusRequestService: service,
      });

      const res = await service.sign(body, timestamps);
      console.log('sign:', res);

      const res2 = await service.request({
        url: '/activation/subject/vip/check',
        data: {
          url: 'http://127.0.0.1:7001/',
        },
      });

      console.log('res2:', res2);
    }
    console.log('2222');
    await test();
    console.log('3333');

    return this.ok(true);
  }
}
