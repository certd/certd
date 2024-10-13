import { MidwayEnvironmentService } from '@midwayjs/core';
import { Controller, Get, Inject, Provide } from '@midwayjs/core';
import { logger } from '@certd/pipeline';
import { Constants } from '@certd/lib-server';

@Provide()
@Controller('/home')
export class HomeController {
  @Inject()
  environmentService: MidwayEnvironmentService;
  @Get('/', { summary: Constants.per.guest })
  async home(): Promise<string> {
    logger.info('当前环境：', this.environmentService.getCurrentEnvironment()); // prod
    return 'Hello Midwayjs!';
  }
}
