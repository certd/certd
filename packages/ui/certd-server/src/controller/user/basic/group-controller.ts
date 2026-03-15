import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { Constants, CrudController } from '@certd/lib-server';
import { AuthService } from '../../../modules/sys/authority/service/auth-service.js';
import { GroupService } from '../../../modules/basic/service/group-service.js';
import { ApiTags } from '@midwayjs/swagger';

/**
 * 通知
 */
@Provide()
@Controller('/api/basic/group')
@ApiTags(['basic-group'])
export class GroupController extends CrudController<GroupService> {
  @Inject()
  service: GroupService;
  @Inject()
  authService: AuthService;

  getService(): GroupService {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body: any) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.projectId = projectId;
    delete body.query.userId;
    const buildQuery = qb => {
      qb.andWhere('user_id = :userId', { userId });
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
  async list(@Body(ALL) body: any) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.projectId = projectId;
    body.query.userId = userId;
    return await super.list(body);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean: any) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    bean.projectId = projectId;
    bean.userId = userId;
    return await super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.getService(), bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    return await super.update(bean);
  }
  @Post('/info', { summary: Constants.per.authOnly })
  async info(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "read");
    return await super.info(id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "write");
    return await super.delete(id);
  }

  @Post('/all', { summary: Constants.per.authOnly })
  async all(@Query('type') type: string) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    const list: any = await this.service.find({
      where: {
        projectId,
        userId,
        type,
      },
    });
    return this.ok(list);
  }
}
