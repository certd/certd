import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController, Constants } from '@certd/lib-server';
import { CnameRecordService } from '../../../modules/cname/service/cname-record-service.js';
import { CnameProviderService } from '../../../modules/cname/service/cname-provider-service.js';
import { ApiTags } from '@midwayjs/swagger';

/**
 * 授权
 */
@Provide()
@Controller('/api/cname/provider')
@ApiTags(['pipeline-cname'])
export class CnameProviderController extends BaseController {
  @Inject()
  service: CnameRecordService;
  @Inject()
  providerService: CnameProviderService;

  getService(): CnameRecordService {
    return this.service;
  }

  @Post('/list', { description: Constants.per.authOnly })
  async list(@Body(ALL) body: any) {
    const res = await this.providerService.list({});
    return this.ok(res);
  }
}
