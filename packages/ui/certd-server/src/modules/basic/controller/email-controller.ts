import { Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController } from '../../../basic/base-controller.js';
import { EmailService } from '../service/email-service.js';
import { Constants } from '../../../basic/constants.js';

/**
 */
@Provide()
@Controller('/api/basic/email')
export class EmailController extends BaseController {
  @Inject()
  emailService: EmailService;

  @Post('/test', { summary: Constants.per.authOnly })
  public async test(
    @Body('receiver')
    receiver
  ) {
    const userId = super.getUserId();
    await this.emailService.test(userId, receiver);
    return this.ok({});
  }
}
