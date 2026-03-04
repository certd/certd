import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { Constants, CrudController } from '@certd/lib-server';
import { CnameRecordService } from '../../../modules/cname/service/cname-record-service.js';

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
    const {userId,projectId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.userId = userId;
    body.query.projectId = projectId;
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

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body: any) {
    const {userId,projectId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.userId = userId;
    body.query.projectId = projectId;
    const list = await this.getService().list(body);
    return this.ok(list);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean: any) {
    const {userId,projectId} = await this.getProjectUserIdWrite();
    bean.userId = userId;
    bean.projectId = projectId;
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean: any) {
    await this.checkOwner(this.getService(), bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    return super.update(bean);
  }

  @Post('/info', { summary: Constants.per.authOnly })
  async info(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "read");
    return super.info(id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id, "write");
    return super.delete(id);
  }

  @Post('/deleteByIds', { summary: Constants.per.authOnly })
  async deleteByIds(@Body(ALL) body: any) {
    const {userId,projectId} = await this.getProjectUserIdWrite();
    await this.service.delete(body.ids, {
      userId,
      projectId,
    });
    return this.ok();
  }
  @Post('/getByDomain', { summary: Constants.per.authOnly })
  async getByDomain(@Body(ALL) body: { domain: string; createOnNotFound: boolean }) {
    const {userId,projectId} = await this.getProjectUserIdRead();
    const res = await this.service.getByDomain(body.domain, userId,projectId, body.createOnNotFound);
    return this.ok(res);
  }

  @Post('/verify', { summary: Constants.per.authOnly })
  async verify(@Body(ALL) body: { id: number }) {
    await this.checkOwner(this.getService(), body.id, "read");
    const res = await this.service.verify(body.id);
    return this.ok(res);
  }

  @Post('/resetStatus', { summary: Constants.per.authOnly })
  async resetStatus(@Body(ALL) body: { id: number }) {
    await this.checkOwner(this.getService(), body.id, "read");
    const res = await this.service.resetStatus(body.id);
    return this.ok(res);
  }
 @Post('/import', { summary: Constants.per.authOnly })
  async import(@Body(ALL) body: { domainList: string; cnameProviderId: any }) {
    const {userId,projectId} = await this.getProjectUserIdWrite();
    const res = await this.service.doImport({
      userId,
      projectId,
      domainList: body.domainList,
      cnameProviderId: body.cnameProviderId,
    });
    return this.ok(res);
  }

}
