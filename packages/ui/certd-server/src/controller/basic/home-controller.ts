import { Controller, Get, Inject, MidwayEnvironmentService, Provide } from '@midwayjs/core';
import { logger } from '@certd/basic';
import { Constants } from '@certd/lib-server';

@Provide()
@Controller('/home')
export class HomeController {
  @Inject()
  environmentService: MidwayEnvironmentService;
  @Get('/', { description: Constants.per.guest })
  async home(): Promise<string> {
    logger.info('当前环境：', this.environmentService.getCurrentEnvironment()); // prod
    return 'Hello Midwayjs!';
  }
}
