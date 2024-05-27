import { Config, Configuration, Logger } from '@midwayjs/decorator';
import { ILogger } from '@midwayjs/logger';
import { IMidwayContainer } from '@midwayjs/core';
import { Cron } from './cron';

// ... (see below) ...
@Configuration({
  namespace: 'cron',
  //importConfigs: [join(__dirname, './config')],
})
export class CronConfiguration {
  @Config()
  config;
  @Logger()
  logger: ILogger;

  cron: Cron;
  async onReady(container: IMidwayContainer) {
    this.logger.info('cron start');
    this.cron = new Cron({
      logger: this.logger,
      ...this.config,
    });
    container.registerObject('cron', this.cron);
    this.logger.info('cron started');
  }
}
