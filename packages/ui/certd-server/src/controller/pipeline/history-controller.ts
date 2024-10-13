import { ALL, Body, Controller, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { CommonException, Constants, CrudController, PermissionException } from '@certd/lib-server';
import { PipelineEntity } from '../../modules/pipeline/entity/pipeline.js';
import { HistoryService } from '../../modules/pipeline/service/history-service.js';
import { HistoryLogService } from '../../modules/pipeline/service/history-log-service.js';
import { HistoryEntity } from '../../modules/pipeline/entity/history.js';
import { HistoryLogEntity } from '../../modules/pipeline/entity/history-log.js';
import { PipelineService } from '../../modules/pipeline/service/pipeline-service.js';
import * as fs from 'fs';
import { logger } from '@certd/pipeline';
import { AuthService } from '../../modules/sys/authority/service/auth-service.js';
import { SysSettingsService } from '@certd/lib-server';
import { In } from 'typeorm';

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

  getService(): HistoryService {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body: any) {
    const isAdmin = await this.authService.isAdmin(this.ctx);
    const publicSettings = await this.sysSettingsService.getPublicSettings();
    const pipelineQuery: any = {};
    if (!(publicSettings.managerOtherUserPipeline && isAdmin)) {
      body.query.userId = this.getUserId();
      pipelineQuery.userId = this.getUserId();
    }

    let pipelineIds: any = null;
    const pipelineTitle = body.query?.pipelineTitle;
    if (pipelineTitle) {
      const pipelines = await this.pipelineService.list({
        query: pipelineQuery,
        buildQuery: qb => {
          qb.andWhere('title like :title', { title: `%${pipelineTitle}%` });
        },
      });
      pipelineIds = pipelines.map(p => p.id);
    }

    const buildQuery = qb => {
      if (pipelineIds) {
        qb.andWhere({
          pipelineId: In(pipelineIds),
        });
      }
    };

    const res = await this.service.page({
      query: body.query,
      page: body.page,
      order: body.order,
      buildQuery,
    });
    return this.ok(res);
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body) {
    const isAdmin = await this.authService.isAdmin(this.ctx);
    if (!isAdmin) {
      body.userId = this.getUserId();
    }
    if (body.pipelineId == null) {
      return this.ok([]);
    }
    const buildQuery = qb => {
      qb.limit(10);
    };
    const listRet = await this.getService().list({
      query: body,
      order: { prop: 'id', asc: false },
      buildQuery,
    });
    return this.ok(listRet);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean: PipelineEntity) {
    bean.userId = this.getUserId();
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), bean.id);
    return super.update(bean);
  }

  @Post('/save', { summary: Constants.per.authOnly })
  async save(@Body(ALL) bean: HistoryEntity) {
    bean.userId = this.getUserId();
    if (bean.id > 0) {
      await this.authService.checkEntityUserId(this.ctx, this.getService(), bean.id);
    }
    await this.service.save(bean);
    return this.ok(bean.id);
  }

  @Post('/saveLog', { summary: Constants.per.authOnly })
  async saveLog(@Body(ALL) bean: HistoryLogEntity) {
    bean.userId = this.getUserId();
    if (bean.id > 0) {
      await this.authService.checkEntityUserId(this.ctx, this.getService(), bean.id);
    }
    await this.logService.save(bean);
    return this.ok(bean.id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), id);
    await super.delete(id);
    return this.ok();
  }

  @Post('/deleteByIds', { summary: Constants.per.authOnly })
  async deleteByIds(@Body(ALL) body: any) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), body.ids);
    const isAdmin = await this.authService.isAdmin(this.ctx);
    const userId = isAdmin ? null : this.getUserId();
    await this.getService().deleteByIds(body.ids, userId);
    return this.ok();
  }

  @Post('/detail', { summary: Constants.per.authOnly })
  async detail(@Query('id') id: number) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), id);
    const detail = await this.service.detail(id);
    return this.ok(detail);
  }

  @Post('/logs', { summary: Constants.per.authOnly })
  async logs(@Query('id') id: number) {
    await this.authService.checkEntityUserId(this.ctx, this.logService, id);
    const logInfo = await this.logService.info(id);
    return this.ok(logInfo);
  }

  @Post('/files', { summary: Constants.per.authOnly })
  async files(@Query('pipelineId') pipelineId: number, @Query('historyId') historyId: number) {
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
    if (history.userId !== this.getUserId()) {
      throw new PermissionException();
    }
    return await this.service.getFiles(history);
  }

  @Get('/download', { summary: Constants.per.authOnly })
  async download(@Query('pipelineId') pipelineId: number, @Query('historyId') historyId: number, @Query('fileId') fileId: string) {
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
