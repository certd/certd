import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { CrudController, SysEmailConf } from '@certd/lib-server';
import { SysSettingsService } from '@certd/lib-server';
import { SysSettingsEntity } from '../entity/sys-settings.js';
import { SysPublicSettings } from '@certd/lib-server';
import * as _ from 'lodash-es';
import { PipelineService } from '../../../pipeline/service/pipeline-service.js';
import { UserSettingsService } from '../../../mine/service/user-settings-service.js';

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
    let conf = await this.service.getSetting<SysEmailConf>(SysEmailConf);
    if (!conf.host && conf.usePlus != null) {
      //到userSetting里面去找
      const adminEmailSetting = await this.userSettingsService.getByKey('email', 1);
      if (adminEmailSetting) {
        const setting = JSON.parse(adminEmailSetting.setting);
        conf = _.merge(conf, setting);
        await this.service.saveSetting(conf);
      }
    }
    return this.ok(conf);
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
