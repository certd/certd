import { Config, Provide } from '@midwayjs/decorator';
import {
  IWebMiddleware,
  IMidwayKoaContext,
  NextFunction
} from '@midwayjs/koa';
import * as _ from 'lodash';
import * as jwt from 'jsonwebtoken';
import { Constants } from '../basic/constants';

/**
 * 权限校验
 */
@Provide()
export class AuthorityMiddleware implements IWebMiddleware {
  @Config('biz.jwt.secret')
  private secret: string;
  @Config('biz.auth.ignoreUrls')
  private ignoreUrls: string[];

  resolve() {
    return async (ctx: IMidwayKoaContext, next: NextFunction) => {
      const { url } = ctx;
      const token = ctx.get('Authorization');
      // 路由地址为 admin前缀的 需要权限校验
      // console.log('ctx', ctx);
      const queryIndex = url.indexOf('?');
      let uri = url;
      if (queryIndex >= 0) {
        uri = url.substring(0, queryIndex);
      }
      const yes = this.ignoreUrls.includes(uri);
      if (yes) {
        await next();
        return;
      }

      try {
        ctx.user = jwt.verify(token, this.secret);
      } catch (err) {
        ctx.status = 401;
        ctx.body = Constants.res.auth;
        return;
      }
      await next();
    };
  }
}
