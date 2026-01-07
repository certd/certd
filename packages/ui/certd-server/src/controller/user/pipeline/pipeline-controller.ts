import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { Constants, CrudController, SysSettingsService } from '@certd/lib-server';
import { PipelineService } from '../../../modules/pipeline/service/pipeline-service.js';
import { PipelineEntity } from '../../../modules/pipeline/entity/pipeline.js';
import { HistoryService } from '../../../modules/pipeline/service/history-service.js';
import { AuthService } from '../../../modules/sys/authority/service/auth-service.js';
import { SiteInfoService } from '../../../modules/monitor/index.js';
import { isPlus } from '@certd/plus-core';

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

  @Inject()
  siteInfoService: SiteInfoService;

  getService() {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body) {
    const isAdmin = await this.authService.isAdmin(this.ctx);
    const publicSettings = await this.sysSettingsService.getPublicSettings();

    let onlyOther = false
    if(isAdmin){
      if(publicSettings.managerOtherUserPipeline){
        //管理员管理 其他用户
        if( body.query.userId === -1){
          //如果只查询其他用户
          onlyOther = true;
          delete body.query.userId;
        }
      }else{
        body.query.userId = this.getUserId();
      }
    }else{
      body.query.userId = this.getUserId();
    }

    const title = body.query.title;
    delete body.query.title;

    const buildQuery = qb => {
      if (title) {
        qb.andWhere('(title like :title or content like :content)', { title: `%${title}%`, content: `%${title}%` });
      }
      if(onlyOther){
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

  @Post('/getSimpleByIds', { summary: Constants.per.authOnly })
  async getSimpleById(@Body(ALL) body) {
    const ret = await this.getService().getSimplePipelines(body.ids,this.getUserId() );
    return this.ok(ret);
  }


  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean: PipelineEntity) {
    bean.userId = this.getUserId();
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), bean.id);
    delete bean.userId;
    return super.update(bean);
  }

  @Post('/save', { summary: Constants.per.authOnly })
  async save(@Body(ALL) bean: {addToMonitorEnabled: boolean, addToMonitorDomains: string} & PipelineEntity) {
    if (bean.id > 0) {
      await this.authService.checkEntityUserId(this.ctx, this.getService(), bean.id);
    } else {
      bean.userId = this.getUserId();
    }

    if(!this.isAdmin()){
      // 非管理员用户 不允许设置流水线有效期
      delete bean.validTime
    }

    const {version} = await this.service.save(bean);
    //是否增加证书监控
    if (bean.addToMonitorEnabled && bean.addToMonitorDomains) {
      const sysPublicSettings = await this.sysSettingsService.getPublicSettings();
      if (isPlus() && sysPublicSettings.certDomainAddToMonitorEnabled) {
        //增加证书监控
        await this.siteInfoService.doImport({
          text: bean.addToMonitorDomains,
          userId: this.getUserId(),
        });
      }
    }
    return this.ok({id:bean.id,version:version});
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), id);
    await this.service.delete(id);
    return this.ok({});
  }

  @Post('/disabled', { summary: Constants.per.authOnly })
  async disabled(@Body(ALL) bean) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), bean.id);
    delete bean.userId;
    await this.service.disabled(bean.id, bean.disabled);
    return this.ok({});
  }

  @Post('/detail', { summary: Constants.per.authOnly })
  async detail(@Query('id') id: number) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), id);
    const detail = await this.service.detail(id);
    return this.ok(detail);
  }

  @Post('/trigger', { summary: Constants.per.authOnly })
  async trigger(@Query('id') id: number, @Query('stepId') stepId?: string) {
    await this.authService.checkEntityUserId(this.ctx, this.getService(), id);
    await this.service.trigger(id, stepId,true);
    return this.ok({});
  }

  @Post('/cancel', { summary: Constants.per.authOnly })
  async cancel(@Query('historyId') historyId: number) {
    await this.authService.checkEntityUserId(this.ctx, this.historyService, historyId);
    await this.service.cancel(historyId);
    return this.ok({});
  }

  @Post('/count', { summary: Constants.per.authOnly })
  async count() {
    const count = await this.service.count({ userId: this.getUserId() });
    return this.ok({ count });
  }

  @Post('/batchDelete', { summary: Constants.per.authOnly })
  async batchDelete(@Body('ids') ids: number[]) {
    const isAdmin = await this.authService.isAdmin(this.ctx);
    const userId = isAdmin ?  undefined : this.getUserId() ;
    await this.service.batchDelete(ids, userId);
    return this.ok({});
  }



  @Post('/batchUpdateGroup', { summary: Constants.per.authOnly })
  async batchUpdateGroup(@Body('ids') ids: number[], @Body('groupId') groupId: number) {
    const isAdmin = await this.authService.isAdmin(this.ctx);
    const userId = isAdmin ?  undefined : this.getUserId() ;
    await this.service.batchUpdateGroup(ids, groupId, userId);
    return this.ok({});
  }


  @Post('/batchUpdateTrigger', { summary: Constants.per.authOnly })
  async batchUpdateTrigger(@Body('ids') ids: number[], @Body('trigger') trigger: any) {
    const isAdmin = await this.authService.isAdmin(this.ctx);
    const userId = isAdmin ?  undefined : this.getUserId() ;
    await this.service.batchUpdateTrigger(ids, trigger, userId);
    return this.ok({});
  }

  @Post('/batchUpdateNotification', { summary: Constants.per.authOnly })
  async batchUpdateNotification(@Body('ids') ids: number[], @Body('notification') notification: any) {
    const isAdmin = await this.authService.isAdmin(this.ctx);
    const userId = isAdmin ?  undefined : this.getUserId() ;
    await this.service.batchUpdateNotifications(ids, notification, userId);
    return this.ok({});
  }

  @Post('/batchRerun', { summary: Constants.per.authOnly })
  async batchRerun(@Body('ids') ids: number[], @Body('force') force: boolean) {
    await this.service.batchRerun(ids, this.getUserId(), force);
    return this.ok({});
  }
}
