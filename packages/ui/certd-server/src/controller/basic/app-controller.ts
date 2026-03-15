import {Body, Controller, Get, Inject, Post, Provide} from '@midwayjs/core';
import { BaseController, Constants, FileService, SysSettingsService, SysSiteInfo } from '@certd/lib-server';
import { http, logger } from '@certd/basic';
import { isComm } from '@certd/plus-core';

/**
 */
@Provide()
@Controller('/api/app/')
export class AppController extends BaseController {
  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  fileService: FileService;

  @Get('/latest', { description: Constants.per.authOnly })
  async latest(): Promise<any> {
    try {
      const res = await http.request({
        url: 'https://registry.npmmirror.com/@certd/pipeline',
        method: 'get',
        logRes: false,
        timeout: 5000,
      });
      const latest = res['dist-tags'].latest;
      return this.ok(latest);
    } catch (e: any) {
      logger.error(e);
      return this.ok('');
    }
  }

  @Get('/favicon', { description: Constants.per.guest })
  public async getFavicon() {
    if (isComm()) {
      const siteInfo = await this.sysSettingsService.getSetting<SysSiteInfo>(SysSiteInfo);
      const favicon = siteInfo.logo;
      if (favicon) {
        const redirect = '/api/basic/file/download?key=' + favicon;
        this.ctx.response.redirect(redirect);
        this.ctx.response.set('Cache-Control', 'public,max-age=25920');
        return;
      }
    }
    const redirect = '/static/images/logo/logo.svg';
    this.ctx.response.redirect(redirect);
    this.ctx.response.set('Cache-Control', 'public,max-age=25920');
  }

  @Post('/webhook', { description: Constants.per.guest })
  public async webhook( @Body() body: any) {
    logger.info('webhook', JSON.stringify(body))
    return this.ok("success")
  }
}
