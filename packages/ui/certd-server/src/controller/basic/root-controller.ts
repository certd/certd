import { Controller, Get, Inject, Provide } from '@midwayjs/core';
import { Constants, SysSettingsService } from '@certd/lib-server';

@Provide()
@Controller('/')
export class HomeController {
  @Inject()
  sysSettingsService: SysSettingsService;
  @Get('/robots.txt', { description: Constants.per.guest })
  async robots(): Promise<string> {
    const publicSettings = await this.sysSettingsService.getPublicSettings();
    if (!publicSettings.robots) {
      return 'User-agent: *\nDisallow: /';
    } else {
      return 'User-agent: *\nAllow: /';
    }
  }
}
