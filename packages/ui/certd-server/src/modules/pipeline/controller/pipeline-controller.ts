import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { CrudController } from '../../../basic/crud-controller.js';
import { PipelineService } from '../service/pipeline-service.js';
import { PipelineEntity } from '../entity/pipeline.js';
import { Constants } from '../../../basic/constants.js';
import { HistoryService } from '../service/history-service.js';
import { AuthService } from '../../authority/service/auth-service.js';
import { SysSettingsService } from '../../system/service/sys-settings-service.js';

/**
 * 证书
 */
@Provide()
@Controller('/api/pi/pipeline')
export class PipelineController extends CrudController<PipelineService> {
  @Inject()
  service: PipelineService;
  @Inject()
  historyService: HistoryService;
  @Inject()
  authService: AuthService;
  @Inject()
  sysSettingsService: SysSettingsService;

  getService() {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body) {
    const isAdmin = await this.authService.isAdmin(this.ctx);
    const publicSettings = await this.sysSettingsService.getPublicSettings();
    if (!(publicSettings.managerOtherUserPipeline && isAdmin)) {
      body.query.userId = this.ctx.user.id;
    }

    const title = body.query.title;
    delete body.query.title;

    const buildQuery = qb => {
      if (title) {
        qb.where('title like :title', { title: `%${title}%` });
      }
    };
    if (!body.sort || !body.sort?.prop) {
      body.sort = { prop: 'order', asc: false };
    }

    const pageRet = await this.getService().page(body?.query, body?.page, body?.sort, buildQuery);
    return this.ok(pageRet);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean: PipelineEntity) {
    bean.userId = this.ctx.user.id;
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), bean.id);
    return super.update(bean);
  }

  @Post('/save', { summary: Constants.per.authOnly })
  async save(@Body(ALL) bean: PipelineEntity) {
    bean.userId = this.ctx.user.id;
    if (bean.id > 0) {
      await this.authService.checkEntityUserId(this.ctx, this.getService(), bean.id);
    }
    await this.service.save(bean);
    return this.ok(bean.id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), id);
    await this.service.delete(id);
    return this.ok({});
  }

  @Post('/detail', { summary: Constants.per.authOnly })
  async detail(@Query('id') id) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), id);
    const detail = await this.service.detail(id);
    return this.ok(detail);
  }

  @Post('/trigger', { summary: Constants.per.authOnly })
  async trigger(@Query('id') id) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), id);
    await this.service.trigger(id);
    return this.ok({});
  }

  @Post('/cancel', { summary: Constants.per.authOnly })
  async cancel(@Query('historyId') historyId) {
    await this.authService.checkEntityUserId(this.ctx, this.historyService, historyId);
    await this.service.cancel(historyId);
    return this.ok({});
  }
}
