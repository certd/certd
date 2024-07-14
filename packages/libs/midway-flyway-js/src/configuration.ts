import { Config, Configuration, Logger } from '@midwayjs/core';
import { Flyway } from './flyway.js';
import type { ILogger } from '@midwayjs/logger';
import { TypeORMDataSourceManager } from '@midwayjs/typeorm';
import type { IMidwayContainer } from '@midwayjs/core';

@Configuration({
  namespace: 'flyway',
  //importConfigs: [join(__dirname, './config')],
})
export class FlywayConfiguration {
  @Config()
  flyway!: any;
  @Logger()
  logger!: ILogger;
  async onReady(container: IMidwayContainer) {
    this.logger.info('flyway start:' + JSON.stringify(this.flyway));
    const dataSourceManager = await container.getAsync(TypeORMDataSourceManager);
    const dataSourceName = this.flyway.dataSourceName || 'default';
    const connection = dataSourceManager.getDataSource(dataSourceName);
    await new Flyway({ ...this.flyway, logger: this.logger, connection }).run();
  }
}
