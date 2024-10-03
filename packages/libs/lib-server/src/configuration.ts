import type { IMidwayContainer } from '@midwayjs/core';
import { Configuration } from '@midwayjs/core';
import { logger } from '@certd/pipeline';
@Configuration({
  namespace: 'lib-server',
})
export class LibServerConfiguration {
  async onReady(container: IMidwayContainer) {
    logger.info('lib start');
  }
}
