import { Constants, CrudController } from '@certd/lib-server';
import { DomainParser } from '@certd/plugin-cert';
import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { SubDomainService } from "../../../modules/pipeline/service/sub-domain-service.js";
import { TaskServiceBuilder } from '../../../modules/pipeline/service/getter/task-service-getter.js';
import { ApiTags } from '@midwayjs/swagger';

/**
 * 子域名托管
 */
@Provide()
@Controller('/api/pi/subDomain')
@ApiTags(['pipeline-subdomain'])
export class SubDomainController extends CrudController<SubDomainService> {
  @Inject()
  service: SubDomainService;

  @Inject()
  taskServiceBuilder: TaskServiceBuilder;

  getService() {
    return this.service;
  }

  @Post('/parseDomain', { description: Constants.per.authOnly, summary: "解析域名" })
  async parseDomain(@Body("fullDomain") fullDomain:string) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    const taskService = this.taskServiceBuilder.create({ userId: userId, projectId: projectId });
    const subDomainGetter = await taskService.getSubDomainsGetter();
    const domainParser = new DomainParser(subDomainGetter)
    const domain = await domainParser.parse(fullDomain)
    return this.ok(domain);
  }


  @Post('/page', { description: Constants.per.authOnly, summary: "查询子域名分页列表" })
  async page(@Body(ALL) body) {
    const {userId,projectId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    delete body.query.userId;
    body.query.projectId = projectId;
    const buildQuery = qb => {
      qb.andWhere('user_id = :userId', { userId: userId });
    };
    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery,
    });
    return this.ok(res);
  }

  @Post('/list', { description: Constants.per.authOnly, summary: "查询子域名列表" })
  async list(@Body(ALL) body) {
    const {userId,projectId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.userId = userId;
    body.query.projectId = projectId;
    return super.list(body);
  }

  @Post('/add', { description: Constants.per.authOnly, summary: "添加子域名" })
  async add(@Body(ALL) bean) {
    const {userId,projectId} = await this.getProjectUserIdRead();
    bean.userId = userId;
    bean.projectId = projectId;
    return super.add(bean);
  }

  @Post('/update', { description: Constants.per.authOnly, summary: "更新子域名" })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.getService(), bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    return super.update(bean);
  }
  @Post('/info', { description: Constants.per.authOnly, summary: "查询子域名详情" })
  async info(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "read");
    return super.info(id);
  }

  @Post('/delete', { description: Constants.per.authOnly, summary: "删除子域名" })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "write");
    return super.delete(id);
  }

  @Post('/batchDelete', { description: Constants.per.authOnly, summary: "批量删除子域名" })
  async batchDelete(@Body('ids') ids: number[]) {
    const {userId,projectId} = await this.getProjectUserIdWrite();
    await this.service.batchDelete(ids, userId, projectId);
    return this.ok({});
  }
}
