import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { Constants, CrudController } from '@certd/lib-server';
import { CnameRecordService } from '../service/cname-record-service.js';

/**
 * 授权
 */
@Provide()
@Controller('/api/cname/record')
export class CnameRecordController extends CrudController<CnameRecordService> {
  @Inject()
  service: CnameRecordService;

  getService(): CnameRecordService {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    body.query.userId = this.ctx.user.id;
    return await super.page(body);
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body: any) {
    body.userId = this.ctx.user.id;
    return super.list(body);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean: any) {
    bean.userId = this.ctx.user.id;
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean: any) {
    await this.service.checkUserId(bean.id, this.ctx.user.id);
    return super.update(bean);
  }

  @Post('/info', { summary: Constants.per.authOnly })
  async info(@Query('id') id: number) {
    await this.service.checkUserId(id, this.ctx.user.id);
    return super.info(id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.service.checkUserId(id, this.ctx.user.id);
    return super.delete(id);
  }

  @Post('/getByDomain', { summary: Constants.per.authOnly })
  async getByDomain(@Body(ALL) body: { domain: string; createOnNotFound: boolean }) {
    const userId = this.ctx.user.id;
    const res = await this.service.getByDomain(body.domain, userId, body.createOnNotFound);
    return this.ok(res);
  }

  @Post('/verify', { summary: Constants.per.authOnly })
  async verify(@Body(ALL) body: { id: string }) {
    const userId = this.ctx.user.id;
    await this.service.checkUserId(body.id, userId);
    const res = await this.service.verify(body.id);
    return this.ok(res);
  }
}
