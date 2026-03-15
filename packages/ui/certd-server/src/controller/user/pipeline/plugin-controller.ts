import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { BaseController, Constants } from '@certd/lib-server';
import { PluginService } from '../../../modules/plugin/service/plugin-service.js';
import { PluginConfigService } from '../../../modules/plugin/service/plugin-config-service.js';
import {pluginGroups} from "@certd/pipeline";
import { ApiTags } from '@midwayjs/swagger';

/**
 * 插件
 */
@Provide()
@Controller('/api/pi/plugin')
@ApiTags(['pipeline-plugin'])
export class PluginController extends BaseController {
  @Inject()
  service: PluginService;

  @Inject()
  pluginConfigService: PluginConfigService;

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Query(ALL) query: any) {
    const list = await this.service.getEnabledBuiltInList();
    return this.ok(list);
  }

  @Post('/groups', { summary: Constants.per.authOnly })
  async groups(@Query(ALL) query: any) {
    const group = await this.service.getEnabledBuildInGroup();
    return this.ok(group);
  }

  @Post('/groupsList', { summary: Constants.per.authOnly })
  async groupsList(@Query(ALL) query: any) {
    const groups = pluginGroups
    const groupsList:any = []
    for (const key in groups) {
      const group = {
        ...groups[key]
      }
      delete group.plugins
      groupsList.push(group)
    }
    return this.ok(groupsList);
  }

  @Post('/getDefineByType', { summary: Constants.per.authOnly })
  async getDefineByType(@Body('type') type: string) {
    const define = await this.service.getDefineByType(type);
    return this.ok(define);
  }

  @Post('/config', { summary: Constants.per.authOnly })
  async config(@Body(ALL) body: { id?: number; name?: string; type: string }) {
    const config = await this.pluginConfigService.getPluginConfig(body);
    return this.ok(config);
  }
}
