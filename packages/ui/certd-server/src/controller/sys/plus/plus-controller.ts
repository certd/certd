import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController, PlusService, SysInstallInfo, SysSettingsService } from '@certd/lib-server';
import { logger } from '@certd/basic';

/**
 */
@Provide()
@Controller('/api/sys/plus')
export class SysPlusController extends BaseController {
  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  plusService: PlusService;

  @Post('/active', { description: 'sys:settings:edit' })
  async active(@Body(ALL) body) {
    const { code, inviteCode } = body;

    await this.plusService.active(code, inviteCode);

    return this.ok(true);
  }
  @Post('/bindUrl', { description: 'sys:settings:edit' })
  async bindUrl(@Body(ALL) body: { url: string ,url2?:string }) {
    const { url,url2 } = body;  
    await this.plusService.register();
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    await this.plusService.bindUrl(url,url2);
    installInfo.bindUrl = url;
    installInfo.bindUrl2 = url2;
    await this.sysSettingsService.saveSetting(installInfo);

    //重新验证vip
    try{
      await this.plusService.verify();
    }catch(e){
      logger.error(`验证配置失败:${e}`);
    }
  

    return this.ok(true);
  }

  @Post('/getVipTrial', { description: 'sys:settings:edit' })
  async getVipTrial(@Body("vipType") vipType?:string) {
    const res = await this.plusService.getVipTrial(vipType);
    return this.ok(res);
  }
  @Post('/getTodayVipOrderCount', { description: 'sys:settings:edit' })
  async getTodayVipOrderCount() {
    const res = await this.plusService.getTodayOrderCount();
    return this.ok(res);
  }
  //
  // @Get('/test', { description: Constants.per.guest })
  // async test() {
  //   const subjectId = 'xxxxxx';
  //   const license = '';
  //   const timestamps = 1728365013899;
  //   const bindUrl = 'http://127.0.0.1:7001/';
  //   const service = new PlusRequestService({
  //     subjectId: subjectId,
  //     plusServerBaseUrls: ['https://api.ai.handsfree.work'],
  //   });
  //   const body = { subjectId, appKey: 'kQth6FHM71IPV3qdWc', url: bindUrl };
  //
  //   async function test() {
  //     await verify({
  //       subjectId: subjectId,
  //       license: license,
  //       plusRequestService: service,
  //     });
  //
  //     const res = await service.sign(body, timestamps);
  //     console.log('sign:', res);
  //
  //     const res2 = await service.request({
  //       url: '/activation/subject/vip/check',
  //       data: {
  //         url: 'http://127.0.0.1:7001/',
  //       },
  //     });
  //
  //     console.log('res2:', res2);
  //   }
  //   console.log('2222');
  //   await test();
  //   console.log('3333');
  //
  //   return this.ok(true);
  // }
}
