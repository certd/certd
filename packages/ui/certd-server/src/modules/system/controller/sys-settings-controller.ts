import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { CrudController } from '../../../basic/crud-controller.js';
import { SysSettingsService } from '../service/sys-settings-service.js';
import { SysSettingsEntity } from '../entity/sys-settings.js';
import { SysPublicSettings } from '../service/models.js';
import * as _ from 'lodash-es';
import { PipelineService } from '../../pipeline/service/pipeline-service.js';

/**
 */
@Provide()
@Controller('/api/sys/settings')
export class SysSettingsController extends CrudController<SysSettingsService> {
  @Inject()
  service: SysSettingsService;
  @Inject()
  pipelineService: PipelineService;

  getService() {
    return this.service;
  }

  @Post('/page', { summary: 'sys:settings:view' })
  async page(@Body(ALL) body) {
    body.query = body.query ?? {};
    body.query.userId = this.ctx.user.id;
    return super.page(body);
  }

  @Post('/list', { summary: 'sys:settings:view' })
  async list(@Body(ALL) body) {
    body.userId = this.ctx.user.id;
    return super.list(body);
  }

  @Post('/add', { summary: 'sys:settings:edit' })
  async add(@Body(ALL) bean) {
    bean.userId = this.ctx.user.id;
    return super.add(bean);
  }

  @Post('/update', { summary: 'sys:settings:edit' })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.ctx.user.id);
    return super.update(bean);
  }
  @Post('/info', { summary: 'sys:settings:view' })
  async info(@Query('id') id) {
    await this.service.checkUserId(id, this.ctx.user.id);
    return super.info(id);
  }

  @Post('/delete', { summary: 'sys:settings:edit' })
  async delete(@Query('id') id) {
    await this.service.checkUserId(id, this.ctx.user.id);
    return super.delete(id);
  }

  @Post('/save', { summary: 'sys:settings:edit' })
  async save(@Body(ALL) bean: SysSettingsEntity) {
    await this.service.save(bean);
    return this.ok({});
  }

  @Post('/get', { summary: 'sys:settings:view' })
  async get(@Query('key') key: string) {
    const entity = await this.service.getByKey(key);
    return this.ok(entity);
  }

  // savePublicSettings
  @Post('/savePublicSettings', { summary: 'sys:settings:edit' })
  async savePublicSettings(@Body(ALL) body) {
    const setting = new SysPublicSettings();
    _.merge(setting, body);
    await this.service.savePublicSettings(setting);
    return this.ok({});
  }
  @Post('/stopOtherUserTimer', { summary: 'sys:settings:edit' })
  async stopOtherUserTimer(@Body(ALL) body) {
    await this.pipelineService.stopOtherUserPipeline(1);
    return this.ok({});
  }
}
