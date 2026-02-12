import { logger } from "@certd/basic";
import { CommonException, Constants, CrudController, PermissionException, SysSettingsService } from "@certd/lib-server";
import { ALL, Body, Controller, Get, Inject, Post, Provide, Query } from "@midwayjs/core";
import * as fs from "fs";
import { In } from "typeorm";
import { UserGrantSetting } from "../../../modules/mine/service/models.js";
import { UserSettingsService } from "../../../modules/mine/service/user-settings-service.js";
import { HistoryLogEntity } from "../../../modules/pipeline/entity/history-log.js";
import { HistoryEntity } from "../../../modules/pipeline/entity/history.js";
import { PipelineEntity } from "../../../modules/pipeline/entity/pipeline.js";
import { HistoryLogService } from "../../../modules/pipeline/service/history-log-service.js";
import { HistoryService } from "../../../modules/pipeline/service/history-service.js";
import { PipelineService } from "../../../modules/pipeline/service/pipeline-service.js";
import { AuthService } from "../../../modules/sys/authority/service/auth-service.js";

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

  @Inject()
  userSettingsService: UserSettingsService;

  getService(): HistoryService {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead()
    body.query.projectId = projectId

    const isAdmin = await this.authService.isAdmin(this.ctx);
    const publicSettings = await this.sysSettingsService.getPublicSettings();
    const pipelineQuery: any = {};
    if (!(publicSettings.managerOtherUserPipeline && isAdmin)) {
      body.query.userId = userId;
      pipelineQuery.userId = userId;
    }
    if (projectId) {
      pipelineQuery.projectId = projectId;
    }

    let pipelineIds: any = null;
    const pipelineTitle = body.query?.pipelineTitle;
    delete body.query.pipelineTitle;
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
      sort: body.sort,
      buildQuery,
    });

    return this.ok(res);
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body) {
    const { projectId, userId } = await this.getProjectUserIdRead()
    if (!body){
      body = {}
    }
    if (projectId){
      body.projectId = projectId
    }

    const isAdmin = this.authService.isAdmin(this.ctx);
    if (!isAdmin) {
      body.userId = userId;
    }

    if (body.pipelineId == null) {
      return this.ok([]);
    }
    const buildQuery = qb => {
      qb.limit(20);
    };
    const withDetail = body.withDetail;
    delete body.withDetail;
    let select: any = null
    if (!withDetail) {
      select = {
        pipeline: true, // 后面这里改成false
        id: true,
        userId: true,
        pipelineId: true,
        status: true,
        // startTime: true,
        triggerType: true,
        endTime: true,
        createTime: true,
        updateTime: true,
        projectId: true,
      };
    }
    const listRet = await this.getService().list({
      query: body,
      sort: { prop: 'id', asc: false },
      buildQuery,
      select
    });

    for (const item of listRet) {
      if (!item.pipeline) {
        continue;
      }
      const json = JSON.parse(item.pipeline);
      delete json.stages;
      item.pipeline = json;

      //@ts-ignore
      item.version = json.version;
      item.status = json.status.result
      delete item.pipeline;
    }

    return this.ok(listRet);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean: PipelineEntity) {
    const { projectId, userId } = await this.getProjectUserIdRead()
    bean.projectId = projectId
    bean.userId = userId;
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.getService(), bean.id,"write",true);
    delete bean.userId;
    return super.update(bean);
  }

  @Post('/save', { summary: Constants.per.authOnly })
  async save(@Body(ALL) bean: HistoryEntity) {
    const { projectId,userId } = await this.getProjectUserIdWrite()
    bean.userId = userId;
    bean.projectId = projectId;
    if (bean.id > 0) {
      //修改
      delete bean.projectId;
      delete bean.userId;
      await this.checkOwner(this.getService(), bean.id,"write",true);
    }
   
    await this.service.save(bean);
    return this.ok(bean.id);
  }

  @Post('/saveLog', { summary: Constants.per.authOnly })
  async saveLog(@Body(ALL) bean: HistoryLogEntity) {
    const { projectId,userId } = await this.getProjectUserIdWrite()
    bean.projectId = projectId;
    bean.userId = userId;
    if (bean.id > 0) {
      //修改
      delete bean.projectId;
      delete bean.userId;
      await this.checkOwner(this.logService, bean.id,"write",true);
    }
    await this.logService.save(bean);
    return this.ok(bean.id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id,"write",true);
    await super.delete(id);
    return this.ok();
  }

  @Post('/deleteByIds', { summary: Constants.per.authOnly })
  async deleteByIds(@Body(ALL) body: any) {
    let {userId} = await this.checkOwner(this.getService(), body.ids,"write",true);
    const isAdmin = await this.authService.isAdmin(this.ctx);
    userId = isAdmin ? null : userId;
    await this.getService().deleteByIds(body.ids, userId);
    return this.ok();
  }

  @Post('/detail', { summary: Constants.per.authOnly })
  async detail(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id,"read",true);
    const detail = await this.service.detail(id);
    return this.ok(detail);
  }

  @Post('/logs', { summary: Constants.per.authOnly })
  async logs(@Query('id') id: number) {
    await this.checkOwner(this.logService, id,"read",true);
    const logInfo = await this.logService.info(id);
    return this.ok(logInfo);
  }

  @Post('/files', { summary: Constants.per.authOnly })
  async files(@Query('pipelineId') pipelineId: number, @Query('historyId') historyId: number) {
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
    const {projectId} = await this.getProjectUserIdRead()
    if (projectId) {
      //enterprise模式
      if(history.projectId !== projectId){
        throw new PermissionException("您没有权限下载该流水线证书，请先加入该项目："+history.projectId);
      }
      //有权限下载
    }else if (history.userId !== this.getUserId()) {
      // 如果是管理员，检查用户是否有授权管理员查看
      const isAdmin = await this.isAdmin()
      if (!isAdmin) {
        throw new PermissionException();
      }
      // 是否允许管理员查看
      const setting = await this.userSettingsService.getSetting<UserGrantSetting>(history.userId, UserGrantSetting, false);
      if (setting?.allowAdminViewCerts!==true) {
        //不允许管理员查看
        throw new PermissionException("该流水线的用户还未授权管理员下载证书，请先让用户在”设置->授权委托“中打开开关");
      }
      //允许管理员查看
    }
    return await this.service.getFiles(history);
  }

  @Get('/download', { summary: Constants.per.authOnly })
  async download(@Query('pipelineId') pipelineId: number, @Query('historyId') historyId: number, @Query('fileId') fileId: string) {
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
