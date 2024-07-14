import { Config, Provide } from '@midwayjs/core';
import { IMidwayKoaContext, NextFunction, IWebMiddleware } from '@midwayjs/koa';
import { PreviewException } from '../basic/exception/preview-exception.js';

/**
 * 预览模式
 */
@Provide()
export class PreviewMiddleware implements IWebMiddleware {
  @Config('preview.enabled')
  private preview: boolean;

  resolve() {
    return async (ctx: IMidwayKoaContext, next: NextFunction) => {
      if (!this.preview) {
        await next();
        return;
      }
      // eslint-disable-next-line prefer-const
      let { url, request } = ctx;
      const body: any = request.body;
      let id = body.id || request.query.id;
      const roleId = body.roleId;
      if (id == null && roleId != null) {
        id = roleId;
      }
      if (id != null && typeof id === 'string') {
        id = parseInt(id);
      }
      if (url.indexOf('?') !== -1) {
        url = url.substring(0, url.indexOf('?'));
      }
      const isModify =
        url.endsWith('update') ||
        url.endsWith('delete') ||
        url.endsWith('authz');
      const isPreviewId = id < 1000;
      if (this.preview && isModify && isPreviewId) {
        throw new PreviewException(
          '对不起，预览环境不允许修改此数据，如需体验请添加新数据'
        );
      }
      await next();
      return;
    };
  }
}
