import { Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { PipelineService } from '../../modules/pipeline/service/pipeline-service.js';
import { BaseController, Constants } from '@certd/lib-server';
import { StorageService } from '../../modules/pipeline/service/storage-service.js';

@Provide()
@Controller('/api/pi/cert')
export class CertController extends BaseController {
  @Inject()
  pipelineService: PipelineService;
  @Inject()
  storeService: StorageService;

  @Post('/get', { summary: Constants.per.authOnly })
  async getCert(@Query('id') id: number) {
    const userId = this.getUserId();
    await this.pipelineService.checkUserId(id, userId);
    const privateVars = this.storeService.getPipelinePrivateVars(id);
    return this.ok(privateVars);
  }
}
