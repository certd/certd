import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { BaseController, Constants } from '@certd/lib-server';
import { PluginService } from '../../modules/plugin/service/plugin-service.js';
import { PluginConfigService } from '../../modules/plugin/service/plugin-config-service.js';

/**
 * 插件
 */
@Provide()
@Controller('/api/pi/plugin')
export class PluginController extends BaseController {
  @Inject()
  service: PluginService;

  @Inject()
  pluginConfigService: PluginConfigService;

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

  @Post('/config', { summary: Constants.per.authOnly })
  async config(@Body(ALL) body: { id?: number; name?: string; type: string }) {
    const config = await this.pluginConfigService.getPluginConfig(body);
    return this.ok(config);
  }
}
