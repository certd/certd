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
    body.query.userId = this.getUserId();
    const domain = body.query.domain;
    delete body.query.domain;

    const bq = qb => {
      if (domain) {
        qb.where('domain like :domain', { domain: `%${domain}%` });
      }
    };

    const pageRet = await this.getService().page(body?.query, body?.page, body?.sort, bq);
    return this.ok(pageRet);
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body: any) {
    body.userId = this.getUserId();
    return super.list(body);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean: any) {
    bean.userId = this.getUserId();
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean: any) {
    await this.service.checkUserId(bean.id, this.getUserId());
    return super.update(bean);
  }

  @Post('/info', { summary: Constants.per.authOnly })
  async info(@Query('id') id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.info(id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.delete(id);
  }

  @Post('/deleteByIds', { summary: Constants.per.authOnly })
  async deleteByIds(@Body(ALL) body: any) {
    await this.service.delete(body.ids, {
      userId: this.getUserId(),
    });
    return this.ok();
  }
  @Post('/getByDomain', { summary: Constants.per.authOnly })
  async getByDomain(@Body(ALL) body: { domain: string; createOnNotFound: boolean }) {
    const userId = this.getUserId();
    const res = await this.service.getByDomain(body.domain, userId, body.createOnNotFound);
    return this.ok(res);
  }

  @Post('/verify', { summary: Constants.per.authOnly })
  async verify(@Body(ALL) body: { id: string }) {
    const userId = this.getUserId();
    await this.service.checkUserId(body.id, userId);
    const res = await this.service.verify(body.id);
    return this.ok(res);
  }
}
