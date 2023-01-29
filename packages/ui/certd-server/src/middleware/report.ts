import { Provide } from '@midwayjs/decorator';
import {
  IWebMiddleware,
  IMidwayKoaContext,
  IMidwayKoaNext,
} from '@midwayjs/koa';
import { logger } from '../utils/logger';

@Provide()
export class ReportMiddleware implements IWebMiddleware {
  resolve() {
    return async (ctx: IMidwayKoaContext, next: IMidwayKoaNext) => {
      const { url } = ctx;
      logger.info('请求开始:', url);
      const startTime = Date.now();
      await next();
      if (ctx.status !== 200) {
        logger.error(
          '请求失败:',
          url,
          ctx.status,
          Date.now() - startTime + 'ms'
        );
      }
      logger.info('请求完成:', url, ctx.status, Date.now() - startTime + 'ms');
    };
  }
}
