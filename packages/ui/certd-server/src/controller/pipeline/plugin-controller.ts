import { ALL, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { BaseController, Constants } from '@certd/lib-server';
import { PluginService } from '../../modules/plugin/service/plugin-service.js';

/**
 * 插件
 */
@Provide()
@Controller('/api/pi/plugin')
export class PluginController extends BaseController {
  @Inject()
  service: PluginService;

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Query(ALL) query: any) {
    query.userId = this.getUserId();
    const list = await this.service.getEnabledBuiltInList();
    return this.ok(list);
  }

  @Post('/groups', { summary: Constants.per.authOnly })
  async groups(@Query(ALL) query: any) {
    query.userId = this.getUserId();
    const group = await this.service.getEnabledBuildInGroup();
    return this.ok(group);
  }
}
