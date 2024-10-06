import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController, Constants } from '@certd/lib-server';
import { CnameRecordService } from '../service/cname-record-service.js';
import { CnameProviderService } from '../../sys/cname/service/cname-provider-service.js';

/**
 * 授权
 */
@Provide()
@Controller('/api/cname/provider')
export class CnameProviderController extends BaseController {
  @Inject()
  service: CnameRecordService;
  @Inject()
  providerService: CnameProviderService;

  getService(): CnameRecordService {
    return this.service;
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body: any) {
    body.userId = this.ctx.user.id;
    const res = await this.providerService.find({});
    return this.ok(res);
  }
}
