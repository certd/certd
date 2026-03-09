import {ALL, Body, Controller, Inject, Post, Provide, Query} from '@midwayjs/core';
import {Constants, CrudController} from '@certd/lib-server';
import { TemplateService } from '../../../modules/pipeline/service/template-service.js';
import { checkPlus } from '@certd/plus-core';

/**
 * 流水线模版
 */
@Provide()
@Controller('/api/pi/template')
export class TemplateController extends CrudController<TemplateService> {
  @Inject()
  service: TemplateService;

  getService() {
    return this.service;
  }


  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body) {
    
    body.query = body.query ?? {};
    delete body.query.userId;
    const { projectId, userId } = await this.getProjectUserIdRead()
    body.query.projectId = projectId
    
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

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body) {
    body.query = body.query ?? {};
    const { projectId, userId } = await this.getProjectUserIdRead()
    body.query.projectId = projectId
    body.query.userId = userId
    return super.list(body);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean) {
    const { projectId, userId } = await this.getProjectUserIdRead()
    bean.userId = userId;
    bean.projectId = projectId
    checkPlus()
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.service, bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    return super.update(bean);
  }
  @Post('/info', { summary: Constants.per.authOnly })
  async info(@Query('id') id: number) {
     await this.checkOwner(this.service, id, "read");
    return super.info(id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
     const { userId ,projectId } = await this.getProjectUserIdWrite()
    await this.service.batchDelete([id], userId,projectId);
    return this.ok({});
  }

  @Post('/batchDelete', { summary: Constants.per.authOnly })
  async batchDelete(@Body('ids') ids: number[]) {
    const { userId ,projectId } = await this.getProjectUserIdWrite()
    await this.service.batchDelete(ids, userId,projectId);
    return this.ok({});
  }

  @Post('/detail', { summary: Constants.per.authOnly })
  async detail(@Query('id') id: number) {
    const { userId ,projectId } = await this.getProjectUserIdRead()
    const detail = await this.service.detail(id, userId,projectId);
    return this.ok(detail);
  }
  @Post('/createPipelineByTemplate', { summary: Constants.per.authOnly })
  async createPipelineByTemplate(@Body(ALL) body: any) {
    const { userId ,projectId } = await this.getProjectUserIdWrite()
    body.userId = userId;
    body.projectId = projectId
    checkPlus()
    const res = await this.service.createPipelineByTemplate(body);
    return this.ok(res);
  }
}
