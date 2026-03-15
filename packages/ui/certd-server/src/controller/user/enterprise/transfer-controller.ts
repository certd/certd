import { BaseController, Constants } from '@certd/lib-server';
import { Controller, Inject, Post, Provide } from '@midwayjs/core';
import { TransferService } from '../../../modules/sys/enterprise/service/transfer-service.js';
import { ApiTags } from '@midwayjs/swagger';

/**
 */
@Provide()
@Controller('/api/enterprise/transfer')
@ApiTags(['enterprise-project'])
export class TransferController extends BaseController {
  @Inject()
  service: TransferService;


  getService(): TransferService {
    return this.service;
  }

   /**
    * 我自己的资源
   * @param body 
   * @returns 
   */
  @Post('/selfResources', { summary: Constants.per.authOnly })
  async selfResources() {
    const userId = this.getUserId();
    const res = await this.service.getUserResources(userId);
    return this.ok(res);
  }

   /**
    * 迁移项目
   * @param body 
   * @returns 
   */
  @Post('/doTransfer', { summary: Constants.per.authOnly })
  async doTransfer() {
    const {projectId} = await this.getProjectUserIdRead();
     const userId = this.getUserId();
    await this.service.transferAll(userId,projectId);
    return this.ok();
  }
}
