import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { Constants, CrudController } from '@certd/lib-server';
import { DomainService } from "../../../modules/cert/service/domain-service.js";
import { checkPlus } from '@certd/plus-core';
import { ApiTags } from '@midwayjs/swagger';

/**
 * 授权
 */
@Provide()
@Controller('/api/cert/domain')
@ApiTags(['cert'])
export class DomainController extends CrudController<DomainService> {
  @Inject()
  service: DomainService;

  getService(): DomainService {
    return this.service;
  }

  @Post('/page', { description: Constants.per.authOnly, summary: "查询域名分页列表" })
  async page(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.projectId = projectId;
    body.query.userId = userId;
    const domain = body.query.domain;
    delete body.query.domain;

    const bq = qb => {
      if (domain) {
        qb.andWhere('domain like :domain', { domain: `%${domain}%` });
      }
    };

    const pageRet = await this.getService().page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery: bq,
    });
    return this.ok(pageRet);
  }

  @Post('/list', { description: Constants.per.authOnly, summary: "查询域名列表" })
  async list(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.projectId = projectId;
    body.query.userId = userId;
    const list = await this.getService().list(body);
    return this.ok(list);
  }

  @Post('/add', { description: Constants.per.authOnly, summary: "添加域名" })
  async add(@Body(ALL) bean: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    bean.projectId = projectId;
    bean.userId = userId;
    return super.add(bean);
  }

  @Post('/update', { description: Constants.per.authOnly, summary: "更新域名" })
  async update(@Body(ALL) bean: any) {
    await this.checkOwner(this.getService(), bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    return super.update(bean);
  }

  @Post('/info', { description: Constants.per.authOnly, summary: "查询域名详情" })
  async info(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "read");
    return super.info(id);
  }

  @Post('/delete', { description: Constants.per.authOnly, summary: "删除域名" })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "write");
    return super.delete(id);
  }

  @Post('/deleteByIds', { description: Constants.per.authOnly, summary: "批量删除域名" })
  async deleteByIds(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    await this.service.delete(body.ids, {
      userId: userId,
      projectId: projectId,
    });
    return this.ok();
  }


  @Post('/import/start', { description: Constants.per.authOnly, summary: "开始域名导入任务" })
  async importStart(@Body(ALL) body: any) {
    checkPlus();
    const { projectId, userId } = await this.getProjectUserIdRead();
    const { key } = body;
    const req = {
      key,
      userId: userId,
      projectId: projectId,
    }
    await this.service.startDomainImportTask(req);
    return this.ok();
  }

  @Post('/import/status', { description: Constants.per.authOnly, summary: "查询域名导入任务状态" })
  async importStatus() {
    const { projectId, userId } = await this.getProjectUserIdRead();
    const req = {
      userId: userId,
      projectId: projectId,
    }
    const task = await this.service.getDomainImportTaskStatus(req);
    return this.ok(task);
  }


  @Post('/import/delete', { description: Constants.per.authOnly, summary: "删除域名导入任务" })
  async importDelete(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    const { key } = body;
    const req = {
      userId: userId,
      projectId: projectId,
      key,
    }
    await this.service.deleteDomainImportTask(req);
    return this.ok();
  }

  @Post('/import/save', { description: Constants.per.authOnly, summary: "保存域名导入任务" })
  async importSave(@Body(ALL) body: any) {
    checkPlus();
    const { projectId, userId } = await this.getProjectUserIdRead();
    const { dnsProviderType, dnsProviderAccessId, key } = body;
    const req = {
      userId: userId,
      projectId: projectId,
      dnsProviderType, dnsProviderAccessId, key
    }
    const item = await this.service.saveDomainImportTask(req);
    return this.ok(item);
  }


  @Post('/sync/expiration/start', { description: Constants.per.authOnly, summary: "开始同步域名过期时间任务" })
  async syncExpirationStart(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    await this.service.startSyncExpirationTask({
      userId: userId,
      projectId: projectId,
    })
    return this.ok();
  }
  @Post('/sync/expiration/status', { description: Constants.per.authOnly, summary: "查询同步域名过期时间任务状态" })
  async syncExpirationStatus(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    const status = await this.service.getSyncExpirationTaskStatus({
      userId: userId,
      projectId: projectId,
    })
    return this.ok(status);
  }



  @Post('/setting/save', { description: Constants.per.authOnly, summary: "保存域名监控设置" })
  async settingSave(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdWrite();
    await this.service.monitorSettingSave({
      userId: userId,
      projectId: projectId,
      setting: {...body},
    })
    return this.ok();
  }

  @Post('/setting/get', { description: Constants.per.authOnly, summary: "查询域名监控设置" })
  async settingGet() {
    const { projectId, userId } = await this.getProjectUserIdRead();
    const setting = await this.service.monitorSettingGet({
      userId: userId,
      projectId: projectId,
    })
    return this.ok(setting);
  }

}
