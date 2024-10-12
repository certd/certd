import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { CrudController, SysPrivateSettings, SysPublicSettings, SysSettingsService } from '@certd/lib-server';
import { SysSettingsEntity } from '../entity/sys-settings.js';
import * as _ from 'lodash-es';
import { PipelineService } from '../../../pipeline/service/pipeline-service.js';
import { UserSettingsService } from '../../../mine/service/user-settings-service.js';
import { getEmailSettings } from '../fix.js';

/**
 */
@Provide()
@Controller('/api/sys/settings')
export class SysSettingsController extends CrudController<SysSettingsService> {
  @Inject()
  service: SysSettingsService;
  @Inject()
  userSettingsService: UserSettingsService;
  @Inject()
  pipelineService: PipelineService;

  getService() {
    return this.service;
  }

  @Post('/page', { summary: 'sys:settings:view' })
  async page(@Body(ALL) body) {
    body.query = body.query ?? {};
    body.query.userId = this.getUserId();
    return super.page(body);
  }

  @Post('/list', { summary: 'sys:settings:view' })
  async list(@Body(ALL) body) {
    body.userId = this.getUserId();
    return super.list(body);
  }

  @Post('/add', { summary: 'sys:settings:edit' })
  async add(@Body(ALL) bean) {
    bean.userId = this.getUserId();
    return super.add(bean);
  }

  @Post('/update', { summary: 'sys:settings:edit' })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.getUserId());
    return super.update(bean);
  }
  @Post('/info', { summary: 'sys:settings:view' })
  async info(@Query('id') id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.info(id);
  }

  @Post('/delete', { summary: 'sys:settings:edit' })
  async delete(@Query('id') id: number) {
    await this.service.checkUserId(id, this.getUserId());
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
  @Post('/getEmailSettings', { summary: 'sys:settings:edit' })
  async getEmailSettings(@Body(ALL) body) {
    const conf = await getEmailSettings(this.service, this.userSettingsService);
    return this.ok(conf);
  }

  @Post('/getSysSettings', { summary: 'sys:settings:edit' })
  async getSysSettings() {
    const publicSettings = await this.service.getPublicSettings();
    const privateSettings = await this.service.getPrivateSettings();
    privateSettings.removeSecret();
    return this.ok({ public: publicSettings, private: privateSettings });
  }

  // savePublicSettings
  @Post('/saveSysSettings', { summary: 'sys:settings:edit' })
  async saveSysSettings(@Body(ALL) body: { public: SysPublicSettings; private: SysPrivateSettings }) {
    const publicSettings = await this.service.getPublicSettings();
    const privateSettings = await this.service.getPrivateSettings();
    _.merge(publicSettings, body.public);
    _.merge(privateSettings, body.private);
    await this.service.savePublicSettings(publicSettings);
    await this.service.savePrivateSettings(privateSettings);
    return this.ok({});
  }
  @Post('/stopOtherUserTimer', { summary: 'sys:settings:edit' })
  async stopOtherUserTimer(@Body(ALL) body) {
    await this.pipelineService.stopOtherUserPipeline(1);
    return this.ok({});
  }
}
