import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { Constants, CrudController } from '@certd/lib-server';
import {DomainService} from "../../../modules/cert/service/domain-service.js";
import { checkPlus } from '@certd/plus-core';

/**
 * 授权
 */
@Provide()
@Controller('/api/cert/domain')
export class DomainController extends CrudController<DomainService> {
  @Inject()
  service: DomainService;

  getService(): DomainService {
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
    body.query = body.query ?? {};
    body.query.userId = this.getUserId();
    const list = await this.getService().list(body);
    return this.ok(list);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean: any) {
    bean.userId = this.getUserId();
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean: any) {
    await this.service.checkUserId(bean.id, this.getUserId());
    delete bean.userId;
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


  @Post('/sync/import', { summary: Constants.per.authOnly })
  async syncImport(@Body(ALL) body: any) {
    const { dnsProviderType, dnsProviderAccessId } = body;
    const req = {
      dnsProviderType, dnsProviderAccessId, userId: this.getUserId(),
    }
    checkPlus()
    await this.service.doSyncFromProvider(req);
    return this.ok();
  }

  @Post('/sync/expiration', { summary: Constants.per.authOnly })
  async syncExpiration(@Body(ALL) body: any) {
    await this.service.doSyncDomainsExpirationDate({
      userId: this.getUserId(),
    })
    return this.ok();
  }

}
