import { ALL, Body, Controller, Post, Provide } from '@midwayjs/core';
import { Constants } from '../../../basic/constants.js';
import { accessRegistry, http, logger, PluginRequest, RequestHandleContext } from '@certd/pipeline';
import { merge } from 'lodash-es';
import { BaseController } from '../../../basic/base-controller.js';
@Provide()
@Controller('/api/pi/handle')
export class HandleController extends BaseController {
  @Post('/', { summary: Constants.per.authOnly })
  async request(@Body(ALL) body: PluginRequest) {
    const type = body.type;
    if (type === 'access') {
      const accessItem = accessRegistry.get(body.typeName);
      const accessCls = accessItem.target;
      if (accessCls == null) {
        throw new Error(`access ${body.typeName} not found`);
      }
      //实例化access
      //@ts-ignore
      const access = new accessCls();
      //注入input
      merge(access, body.input);
      const ctx: RequestHandleContext = {
        http: http,
        logger: logger,
      };
      const res = await access.onRequest(body, ctx);

      return this.ok(res);
    } else if (type === 'plugin') {
      throw new Error(`plugin:${body.typeName} not support`);
    } else {
      throw new Error(`type:${type} not support`);
    }
  }
}
