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

  @Post('/page', { description: Constants.per.authOnly, summary: "查询开放API密钥分页列表" })
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
    this.keySecretDesensitization(res.records);
    return this.ok(res);
  }

  private keySecretDesensitization(list: any[]) {
    for (const item of list) {
      item.keySecret = item.keySecret?.substring(0, 4) + '*********************************' + item.keySecret?.substring(item.keySecret.length - 4); 
    }
  }

  @Post('/list', { description: Constants.per.authOnly, summary: "查询开放API密钥列表" })
  async list(@Body(ALL) body: any) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.projectId = projectId;
    body.query.userId = userId;
    const res = await this.service.list(body);
    this.keySecretDesensitization(res);
    return this.ok(res);
  }

  @Post('/add', { description: Constants.per.authOnly, summary: "添加开放API密钥" })
  async add(@Body(ALL) body: any) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    body.projectId = projectId;
    body.userId = userId;
    const res = await this.service.add(body);
    return this.ok(res);
  }

  @Post('/update', { description: Constants.per.authOnly, summary: "更新开放API密钥" })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.getService(), bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    await this.service.update(bean);
    return this.ok();
  }
  @Post('/info', { description: Constants.per.authOnly, summary: "查询开放API密钥详情" })
  async info(@Query('id') id: number) {
    const info = await this.checkPermission(id);
    return this.ok(info);
  }

  private async checkPermission(id: number) {
    const info = await this.service.info(id);
    if (!info) {
      throw new Error('密钥不存在');
    }
    if (info.scope === 'user'){
      await this.checkOwner(this.getService(), id, "write");;
    }else{
      await this.checkOwner(this.getService(), id, "read");
    }
    return info
  }
  

  @Post('/delete', { description: Constants.per.authOnly, summary: "删除开放API密钥" })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "write");
    return await super.delete(id);
  }

  @Post('/getApiToken', { description: Constants.per.authOnly, summary: "获取API测试令牌" })
  async getApiToken(@Body('id') id: number) {
    await this.checkPermission(id);
    const token = await this.service.getApiToken(id);
    return this.ok(token);
  }

  @Post('/getSecret', { description: Constants.per.authOnly, summary: "获取密钥" })
  async getSecret(@Body('id') id: number) {
    const info = await this.checkPermission(id);
    return this.ok(info.keySecret);
  }
}
