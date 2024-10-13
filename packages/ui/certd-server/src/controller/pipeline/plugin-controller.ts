import { ALL, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { BaseController } from '@certd/lib-server';
import { BuiltInPluginService } from '../../modules/pipeline/service/plugin-service.js';
import { Constants } from '@certd/lib-server';

/**
 * 插件
 */
@Provide()
@Controller('/api/pi/plugin')
export class PluginController extends BaseController {
  @Inject()
  service: BuiltInPluginService;

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Query(ALL) query: any) {
    query.userId = this.getUserId();
    const list = this.service.getList();
    return this.ok(list);
  }

  @Post('/groups', { summary: Constants.per.authOnly })
  async groups(@Query(ALL) query: any) {
    query.userId = this.getUserId();
    const group = this.service.getGroups();
    return this.ok(group);
  }
}
