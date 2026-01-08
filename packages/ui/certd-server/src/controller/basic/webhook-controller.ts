import { BaseController, Constants } from '@certd/lib-server';
import { Controller, Get, Inject, Param, Post, Provide } from '@midwayjs/core';
import { PipelineService } from '../../modules/pipeline/service/pipeline-service.js';

/**
 */
@Provide()
@Controller('/api/webhook/')
export class WebhookController extends BaseController {
  @Inject()
  pipelineService: PipelineService;

  @Get('/:webhookKey', { summary: Constants.per.guest })
  @Post('/:webhookKey', { summary: Constants.per.guest })
  async webhook(@Param('webhookKey') webhookKey: string): Promise<any> {
    await this.pipelineService.triggerByWebhook(webhookKey);
    return this.ok({});
  }
}
