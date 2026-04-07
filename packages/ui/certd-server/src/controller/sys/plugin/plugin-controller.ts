import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { merge } from 'lodash-es';
import { CrudController } from '@certd/lib-server';
import { PluginImportReq, PluginService } from "../../../modules/plugin/service/plugin-service.js";
import {
  CommPluginConfig,
  PluginConfig,
  PluginConfigService
} from '../../../modules/plugin/service/plugin-config-service.js';
/**
 * 插件
 */
@Provide()
@Controller('/api/sys/plugin')
export class PluginController extends CrudController<PluginService> {
  @Inject()
  service: PluginService;

  @Inject()
  pluginConfigService: PluginConfigService;

  getService() {
    return this.service;
  }

  @Post('/page', { description: 'sys:settings:view' })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    return await super.page(body);
  }

  @Post('/list', { description: 'sys:settings:view' })
  async list(@Body(ALL) body: any) {
    return super.list(body);
  }

  @Post('/add', { description: 'sys:settings:edit' })
  async add(@Body(ALL) bean: any) {
    const def: any = {
      isDefault: false,
      disabled: false,
    };
    merge(bean, def);
    return super.add(bean);
  }

  @Post('/update', { description: 'sys:settings:edit' })
  async update(@Body(ALL) bean: any) {

    const res = await super.update(bean);
    return res
  }

  @Post('/info', { description: 'sys:settings:view' })
  async info(@Query('id') id: number) {
    return super.info(id);
  }

  @Post('/delete', { description: 'sys:settings:edit' })
  async delete(@Query('id') id: number) {
    const res = await this.service.deleteByIds([id]);
    return this.ok(res);
  }

  @Post('/deleteByIds', { description: 'sys:settings:edit' })
  async deleteByIds(@Body('ids') ids: number[]) {
    const res = await this.service.deleteByIds(ids);
    return this.ok(res);
  }

  @Post('/setDisabled', { description: 'sys:settings:edit' })
  async setDisabled(@Body(ALL) body: { id: number; name: string; type: string; disabled: boolean }) {
    await this.service.setDisabled(body);
    return this.ok();
  }
  @Post('/getCommPluginConfigs', { description: 'sys:settings:view' })
  async getCommPluginConfigs() {
    const res = await this.pluginConfigService.getCommPluginConfig();
    return this.ok(res);
  }

  @Post('/saveCommPluginConfigs', { description: 'sys:settings:edit' })
  async saveCommPluginConfigs(@Body(ALL) body: CommPluginConfig) {
    const res = await this.pluginConfigService.saveCommPluginConfig(body);
    return this.ok(res);
  }
  @Post('/saveSetting', { description: 'sys:settings:edit' })
  async saveSetting(@Body(ALL) body: PluginConfig) {
    const res = await this.pluginConfigService.savePluginConfig(body);
    return this.ok(res);
  }

  @Post('/import', { description: 'sys:settings:edit' })
  async import(@Body(ALL) body: PluginImportReq) {
    const res = await this.service.importPlugin(body);
    return this.ok(res);
  }

  @Post('/export', { description: 'sys:settings:edit' })
  async export(@Body('id') id: number) {
    const res = await this.service.exportPlugin(id);
    return this.ok(res);
  }
}
