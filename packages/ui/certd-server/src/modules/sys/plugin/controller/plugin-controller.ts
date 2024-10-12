import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { merge } from 'lodash-es';
import { CrudController } from '@certd/lib-server';
import { PluginService } from '../service/plugin-service.js';
import { checkComm } from '@certd/pipeline';

/**
 * 插件
 */
@Provide()
@Controller('/api/sys/plugin')
export class PluginController extends CrudController<PluginService> {
  @Inject()
  service: PluginService;

  getService() {
    checkComm();
    return this.service;
  }

  @Post('/page', { summary: 'sys:settings:view' })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    return await super.page(body);
  }

  @Post('/list', { summary: 'sys:settings:view' })
  async list(@Body(ALL) body: any) {
    return super.list(body);
  }

  @Post('/add', { summary: 'sys:settings:edit' })
  async add(@Body(ALL) bean: any) {
    const def: any = {
      isDefault: false,
      disabled: false,
    };
    merge(bean, def);
    return super.add(bean);
  }

  @Post('/update', { summary: 'sys:settings:edit' })
  async update(@Body(ALL) bean: any) {
    return super.update(bean);
  }

  @Post('/info', { summary: 'sys:settings:view' })
  async info(@Query('id') id: number) {
    return super.info(id);
  }

  @Post('/delete', { summary: 'sys:settings:edit' })
  async delete(@Query('id') id: number) {
    return super.delete(id);
  }

  @Post('/deleteByIds', { summary: 'sys:settings:edit' })
  async deleteByIds(@Body(ALL) body: { ids: number[] }) {
    const res = await this.service.delete(body.ids);
    return this.ok(res);
  }

  @Post('/setDisabled', { summary: 'sys:settings:edit' })
  async setDisabled(@Body('id') id: number, @Body('disabled') disabled: boolean) {
    await this.service.setDisabled(id, disabled);
    return this.ok();
  }
}
