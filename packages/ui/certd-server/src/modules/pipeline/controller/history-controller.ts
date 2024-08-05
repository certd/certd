import { ALL, Body, Controller, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { CrudController } from '../../../basic/crud-controller.js';
import { PipelineEntity } from '../entity/pipeline.js';
import { HistoryService } from '../service/history-service.js';
import { HistoryLogService } from '../service/history-log-service.js';
import { HistoryEntity } from '../entity/history.js';
import { HistoryLogEntity } from '../entity/history-log.js';
import { Constants } from '../../../basic/constants.js';
import { PipelineService } from '../service/pipeline-service.js';
import { CommonException } from '../../../basic/exception/common-exception.js';
import { PermissionException } from '../../../basic/exception/permission-exception.js';
import * as fs from 'fs';
import { logger } from '../../../utils/logger.js';
import { AuthService } from '../../authority/service/auth-service.js';
import { SysSettingsService } from '../../system/service/sys-settings-service.js';

/**
 * 证书
 */
@Provide()
@Controller('/api/pi/history')
export class HistoryController extends CrudController<HistoryService> {
  @Inject()
  service: HistoryService;
  @Inject()
  pipelineService: PipelineService;
  @Inject()
  logService: HistoryLogService;

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

    const res = await super.page(body);

    return res;
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body) {
    const isAdmin = await this.authService.isAdmin(this.ctx);
    if (!isAdmin) {
      body.userId = this.ctx.user.id;
    }
    if (body.pipelineId == null) {
      return this.ok([]);
    }
    const buildQuery = qb => {
      qb.limit(10);
    };
    const listRet = await this.getService().list(body, { prop: 'id', asc: false }, buildQuery);
    return this.ok(listRet);
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
  async save(@Body(ALL) bean: HistoryEntity) {
    bean.userId = this.ctx.user.id;
    if (bean.id > 0) {
      await this.authService.checkEntityUserId(this.ctx, this.getService(), bean.id);
    }
    await this.service.save(bean);
    return this.ok(bean.id);
  }

  @Post('/saveLog', { summary: Constants.per.authOnly })
  async saveLog(@Body(ALL) bean: HistoryLogEntity) {
    bean.userId = this.ctx.user.id;
    if (bean.id > 0) {
      await this.authService.checkEntityUserId(this.ctx, this.getService(), bean.id);
    }
    await this.logService.save(bean);
    return this.ok(bean.id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), id);
    await super.delete(id);
    return this.ok();
  }

  @Post('/deleteByIds', { summary: Constants.per.authOnly })
  async deleteByIds(@Body(ALL) body) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), body.ids);
    const isAdmin = await this.authService.isAdmin(this.ctx);
    const userId = isAdmin ? null : this.ctx.user.id;
    await this.getService().deleteByIds(body.ids, userId);
    return this.ok();
  }

  @Post('/detail', { summary: Constants.per.authOnly })
  async detail(@Query('id') id) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), id);
    const detail = await this.service.detail(id);
    return this.ok(detail);
  }

  @Post('/logs', { summary: Constants.per.authOnly })
  async logs(@Query('id') id) {
    await this.authService.checkEntityUserId(this.ctx, this.logService, id);
    const logInfo = await this.logService.info(id);
    return this.ok(logInfo);
  }

  @Post('/files', { summary: Constants.per.authOnly })
  async files(@Query('pipelineId') pipelineId, @Query('historyId') historyId) {
    await this.authService.checkEntityUserId(this.ctx, this.service, historyId);
    const files = await this.getFiles(historyId, pipelineId);
    return this.ok(files);
  }

  private async getFiles(historyId, pipelineId) {
    let history = null;
    if (historyId != null) {
      // nothing
      history = await this.service.info(historyId);
    } else if (pipelineId != null) {
      history = await this.service.getLastHistory(pipelineId);
    }
    if (history == null) {
      throw new CommonException('historyId is null');
    }
    if (history.userId !== this.ctx.user.id) {
      throw new PermissionException();
    }
    return await this.service.getFiles(history);
  }

  @Get('/download', { summary: Constants.per.authOnly })
  async download(@Query('pipelineId') pipelineId, @Query('historyId') historyId, @Query('fileId') fileId) {
    await this.authService.checkEntityUserId(this.ctx, this.service, historyId);
    const files = await this.getFiles(historyId, pipelineId);
    const file = files.find(f => f.id === fileId);
    if (file == null) {
      throw new CommonException('file not found');
    }
    // koa send file
    // 下载文件的名称
    // const filename = file.filename;
    // 要下载的文件的完整路径
    const path = file.path;
    logger.info(`download:${path}`);
    // 以流的形式下载文件
    this.ctx.attachment(path);
    this.ctx.set('Content-Type', 'application/octet-stream');

    return fs.createReadStream(path);
  }
}
