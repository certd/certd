import { ALL, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { BaseController } from '../../../basic/base-controller.js';
import { PluginService } from '../service/plugin-service.js';
import { Constants } from '../../../basic/constants.js';

/**
 * 插件
 */
@Provide()
@Controller('/api/pi/plugin')
export class PluginController extends BaseController {
  @Inject()
  service: PluginService;

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Query(ALL) query) {
    query.userId = this.ctx.user.id;
    const list = this.service.getList();
    return this.ok(list);
  }

  @Post('/groups', { summary: Constants.per.authOnly })
  async groups(@Query(ALL) query) {
    query.userId = this.ctx.user.id;
    const group = this.service.getGroups();
    return this.ok(group);
  }
}
