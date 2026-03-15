import { Constants, CrudController, SysSettingsService } from '@certd/lib-server';
import { isPlus } from '@certd/plus-core';
import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { SiteInfoService } from '../../../modules/monitor/index.js';
import { PipelineEntity } from '../../../modules/pipeline/entity/pipeline.js';
import { HistoryService } from '../../../modules/pipeline/service/history-service.js';
import { PipelineService } from '../../../modules/pipeline/service/pipeline-service.js';
import { AuthService } from '../../../modules/sys/authority/service/auth-service.js';
import { ApiTags } from '@midwayjs/swagger';

/**
 * 证书
 */
@Provide()
@ApiTags(['pipeline'])
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

  @Inject()
  siteInfoService: SiteInfoService;


  getService() {
    return this.service;
  }

  @Post('/page', { description: Constants.per.authOnly })
  async page(@Body(ALL) body) {
    const isAdmin = await this.authService.isAdmin(this.ctx);
    const publicSettings = await this.sysSettingsService.getPublicSettings();

    const { projectId, userId } = await this.getProjectUserIdRead()
    body.query.projectId = projectId
    let onlyOther = false
    if (isAdmin) {
      if (publicSettings.managerOtherUserPipeline) {
        //管理员管理 其他用户
        if (body.query.userId === -1) {
          //如果只查询其他用户
          onlyOther = true;
          delete body.query.userId;
        }
      } else {
        body.query.userId = userId;
      }
    } else {
      body.query.userId = userId;
    }

    const title = body.query.title;
    delete body.query.title;

    const buildQuery = qb => {
      if (title) {
        qb.andWhere('(title like :title or content like :content)', { title: `%${title}%`, content: `%${title}%` });
      }
      if (onlyOther) {
        qb.andWhere('user_id  != :userId', { userId: this.getUserId() });
      }
    };
    if (!body.sort || !body.sort?.prop) {
      body.sort = { prop: 'order', asc: false };
    }

    const pageRet = await this.getService().page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery,
    });
    return this.ok(pageRet);
  }

  @Post('/getSimpleByIds', { description: Constants.per.authOnly })
  async getSimpleById(@Body(ALL) body) {
    const { projectId, userId } = await this.getProjectUserIdRead()
    const ret = await this.getService().getSimplePipelines(body.ids, userId, projectId);
    return this.ok(ret);
  }


  // @Post('/add', { description: Constants.per.authOnly })
  // async add(@Body(ALL) bean: PipelineEntity) {
  //   const { projectId, userId } = await this.getProjectUserIdWrite()
  //   bean.userId = userId
  //   bean.projectId = projectId
  //   return super.add(bean);
  // }

  // @Post('/update', { description: Constants.per.authOnly })
  // async update(@Body(ALL) bean) {
  //   await this.checkOwner(this.getService(), bean.id,"write",true);
  //   delete bean.userId;
  //   delete bean.projectId;
  //   return super.update(bean);
  // }

  @Post('/save', { description: Constants.per.authOnly, summary: '新增/更新流水线' })
  async save(@Body(ALL) bean: { addToMonitorEnabled: boolean, addToMonitorDomains: string } & PipelineEntity) {
     const { userId ,projectId} = await this.getProjectUserIdWrite()
    if (bean.id > 0) {
      const {userId,projectId} = await this.checkOwner(this.getService(), bean.id,"write",true);
      bean.userId = userId;
      bean.projectId = projectId;
    } else {
      bean.userId = userId;
      bean.projectId = projectId;
    }

    if (!this.isAdmin()) {
      // 非管理员用户 不允许设置流水线有效期
      delete bean.validTime
    }

    const { version } = await this.service.save(bean);
    //是否增加证书监控
    if (bean.addToMonitorEnabled && bean.addToMonitorDomains) {
      const sysPublicSettings = await this.sysSettingsService.getPublicSettings();
      if (isPlus() && sysPublicSettings.certDomainAddToMonitorEnabled) {
        //增加证书监控
        await this.siteInfoService.doImport({
          text: bean.addToMonitorDomains,
          userId: userId,
          projectId: projectId,
        });
      }
    }
    return this.ok({ id: bean.id, version: version });
  }

  @Post('/delete', { description: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id,"write",true);
    await this.service.delete(id);
    return this.ok({});
  }

  @Post('/disabled', { description: Constants.per.authOnly })
  async disabled(@Body(ALL) bean) {
    await this.checkOwner(this.getService(), bean.id,"write",true);
    delete bean.userId;
    delete bean.projectId;
    await this.service.disabled(bean.id, bean.disabled);
    return this.ok({});
  }

  @Post('/detail', { description: Constants.per.authOnly })
  async detail(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id,"read",true);
    const detail = await this.service.detail(id);
    return this.ok(detail);
  }

  @Post('/trigger', { description: Constants.per.authOnly })
  async trigger(@Query('id') id: number, @Query('stepId') stepId?: string) {
    await this.checkOwner(this.getService(), id,"write",true);
    await this.service.trigger(id, stepId, true);
    return this.ok({});
  }

  @Post('/cancel', { description: Constants.per.authOnly })
  async cancel(@Query('historyId') historyId: number) {
    await this.checkOwner(this.historyService, historyId,"write",true);
    await this.service.cancel(historyId);
    return this.ok({});
  }

  @Post('/count', { description: Constants.per.authOnly })
  async count() {
    const { userId } = await this.getProjectUserIdRead()
    const count = await this.service.count({ userId: userId });
    return this.ok({ count });
  }


  private async checkPermissionCall(callback:any){
    let { projectId ,userId} = await this.getProjectUserIdWrite()
    if(projectId){
      return await callback({userId,projectId});
    }
    const isAdmin = await this.authService.isAdmin(this.ctx);
    userId = isAdmin ? undefined : userId;
    return await callback({userId});
  }

  @Post('/batchDelete', { description: Constants.per.authOnly })
  async batchDelete(@Body('ids') ids: number[]) {
    // let { projectId ,userId} = await this.getProjectUserIdWrite()
    // if(projectId){
    //   await this.service.batchDelete(ids, null,projectId);
    //   return this.ok({});
    // }
    // const isAdmin = await this.authService.isAdmin(this.ctx);
    // userId = isAdmin ? undefined : userId;
    // await this.service.batchDelete(ids, userId);
    // return this.ok({});
    await this.checkPermissionCall(async ({userId,projectId})=>{
      await this.service.batchDelete(ids, userId,projectId);
    })
    return this.ok({})
  }



  @Post('/batchUpdateGroup', { description: Constants.per.authOnly })
  async batchUpdateGroup(@Body('ids') ids: number[], @Body('groupId') groupId: number) {
    // let { projectId ,userId} = await this.getProjectUserIdWrite()
    // if(projectId){
    //   await this.service.batchUpdateGroup(ids, groupId, null,projectId);
    //   return this.ok({});
    // }

    // const isAdmin = await this.authService.isAdmin(this.ctx);
    // userId = isAdmin ? undefined : this.getUserId();
    // await this.service.batchUpdateGroup(ids, groupId, userId);
    await this.checkPermissionCall(async ({userId,projectId})=>{
      await this.service.batchUpdateGroup(ids, groupId, userId,projectId);
    })
    return this.ok({});
  }


  @Post('/batchUpdateTrigger', { description: Constants.per.authOnly })
  async batchUpdateTrigger(@Body('ids') ids: number[], @Body('trigger') trigger: any) {
    // let { projectId ,userId} = await this.getProjectUserIdWrite()
    // if(projectId){
    //  await this.service.batchUpdateTrigger(ids, trigger, null,projectId);
    //   return this.ok({});
    // }

    // const isAdmin = await this.authService.isAdmin(this.ctx);
    // userId = isAdmin ? undefined : this.getUserId();
    // await this.service.batchUpdateTrigger(ids, trigger, userId);
    await this.checkPermissionCall(async ({userId,projectId})=>{
      await this.service.batchUpdateTrigger(ids, trigger, userId,projectId);
    })
    return this.ok({});
  }

  @Post('/batchUpdateNotification', { description: Constants.per.authOnly })
  async batchUpdateNotification(@Body('ids') ids: number[], @Body('notification') notification: any) {
    // const isAdmin = await this.authService.isAdmin(this.ctx);
    // const userId = isAdmin ? undefined : this.getUserId();
    // await this.service.batchUpdateNotifications(ids, notification, userId);
    await this.checkPermissionCall(async ({userId,projectId})=>{
      await this.service.batchUpdateNotifications(ids, notification, userId,projectId);
    })
    return this.ok({});
  }

  @Post('/batchRerun', { description: Constants.per.authOnly })
  async batchRerun(@Body('ids') ids: number[], @Body('force') force: boolean) {
    await this.checkPermissionCall(async ({userId,projectId})=>{
      await this.service.batchRerun(ids,  force,userId,projectId);
    })
    return this.ok({});
  }

  @Post('/batchTransfer', { description: Constants.per.authOnly })
  async batchTransfer(@Body('ids') ids: number[], @Body('toProjectId') toProjectId: number) {
    await this.checkPermissionCall(async ({})=>{
      await this.service.batchTransfer(ids, toProjectId);
    })
    return this.ok({});
  }

  @Post('/refreshWebhookKey', { description: Constants.per.authOnly })
  async refreshWebhookKey(@Body('id') id: number) {
    await this.checkOwner(this.getService(), id,"write",true);
    const res = await this.service.refreshWebhookKey(id);
    return this.ok({
      webhookKey: res,
    });
  }

}
