import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { Constants, CrudController } from '@certd/lib-server';
import { AuthService } from '../../../modules/sys/authority/service/auth-service.js';
import { OpenKeyService } from '../../../modules/open/service/open-key-service.js';
import { ApiTags } from '@midwayjs/swagger';

/**
 */
@Provide()
@Controller('/api/open/key')
@ApiTags(['open'])
export class OpenKeyController extends CrudController<OpenKeyService> {
  @Inject()
  service: OpenKeyService;
  @Inject()
  authService: AuthService;

  getService(): OpenKeyService {
    return this.service;
  }

  @Post('/page', { description: Constants.per.authOnly })
  async page(@Body(ALL) body: any) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.projectId = projectId;
    body.query.userId = userId;
    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
    });
    return this.ok(res);
  }

  @Post('/list', { description: Constants.per.authOnly })
  async list(@Body(ALL) body: any) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.projectId = projectId;
    body.query.userId = userId;
    return await super.list(body);
  }

  @Post('/add', { description: Constants.per.authOnly })
  async add(@Body(ALL) body: any) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    body.projectId = projectId;
    body.userId = userId;
    const res = await this.service.add(body);
    return this.ok(res);
  }

  @Post('/update', { description: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.getService(), bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    await this.service.update(bean);
    return this.ok();
  }
  @Post('/info', { description: Constants.per.authOnly })
  async info(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "read");
    return await super.info(id);
  }

  @Post('/delete', { description: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "write");
    return await super.delete(id);
  }

  @Post('/getApiToken', { description: Constants.per.authOnly })
  async getApiToken(@Body('id') id: number) {
    await this.checkOwner(this.getService(), id, "write");
    const token = await this.service.getApiToken(id);
    return this.ok(token);
  }
}
