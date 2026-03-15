import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { Constants, CrudController } from '@certd/lib-server';
import { AuthService } from '../../../modules/sys/authority/service/auth-service.js';
import { PipelineGroupService } from '../../../modules/pipeline/service/pipeline-group-service.js';
import { ApiTags } from '@midwayjs/swagger';

/**
 * 通知
 */
@Provide()
@Controller('/api/pi/pipeline/group')
@ApiTags(['pipeline-group'])
export class PipelineGroupController extends CrudController<PipelineGroupService> {
  @Inject()
  service: PipelineGroupService;
  @Inject()
  authService: AuthService;

  getService(): PipelineGroupService {
    return this.service;
  }

  @Post('/page', { description: Constants.per.authOnly, summary: "查询流水线分组分页列表" })
  async page(@Body(ALL) body: any) {
    const {projectId,userId} = await this.getProjectUserIdRead();
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

  @Post('/list', { description: Constants.per.authOnly, summary: "查询流水线分组列表" })
  async list(@Body(ALL) body: any) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.userId = userId;
    body.query.projectId = projectId;
    return await super.list(body);
  }

  @Post('/add', { description: Constants.per.authOnly, summary: "添加流水线分组" })
  async add(@Body(ALL) bean: any) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    bean.userId = userId;
    bean.projectId = projectId;
    return await super.add(bean);
  }

  @Post('/update', { description: Constants.per.authOnly, summary: "更新流水线分组" })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.getService(), bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    return await super.update(bean);
  }
  @Post('/info', { description: Constants.per.authOnly, summary: "查询流水线分组详情" })
  async info(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "read");
    return await super.info(id);
  }

  @Post('/delete', { description: Constants.per.authOnly, summary: "删除流水线分组" })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "write");
    return await super.delete(id);
  }

  @Post('/all', { description: Constants.per.authOnly, summary: "查询所有流水线分组" })
  async all() {
    const {projectId,userId} = await this.getProjectUserIdRead();
    const list: any = await this.service.find({
      where: {
        userId: userId,
        projectId: projectId,
      },
    });
    return this.ok(list);
  }
}
