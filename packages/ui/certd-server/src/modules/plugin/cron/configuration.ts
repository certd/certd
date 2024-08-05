import { Config, Configuration, Logger } from '@midwayjs/core';
import { ILogger } from '@midwayjs/logger';
import { IMidwayContainer } from '@midwayjs/core';
import { Cron } from './cron.js';

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
    this.cron.start();
    this.logger.info('cron started');
  }
}
