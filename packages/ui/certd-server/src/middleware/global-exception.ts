import { Provide } from '@midwayjs/decorator';
import {
  IWebMiddleware,
  IMidwayKoaContext,
  NextFunction,
} from '@midwayjs/koa';
import { logger } from '../utils/logger';
import { Result } from '../basic/result';

@Provide()
export class GlobalExceptionMiddleware implements IWebMiddleware {
  resolve() {
    return async (ctx: IMidwayKoaContext, next: NextFunction) => {
      const { url } = ctx;
      const startTime = Date.now();
      logger.info('请求开始:', url);
      try {
        await next();
        logger.info('请求完成', url, Date.now() - startTime + 'ms');
      } catch (err) {
        logger.error('请求异常:', url, Date.now() - startTime + 'ms', err);
        ctx.status = 200;
        ctx.body = Result.error(err.code != null ? err.code : 1, err.message);
      }
    };
  }
}
