import { Body, Controller, Inject, Post, Provide } from '@midwayjs/decorator';
import { BaseController } from '../../../basic/base-controller';
import { EmailService } from '../service/email-service';

/**
 */
@Provide()
@Controller('/api/basic/email')
export class EmailController extends BaseController {
  @Inject()
  emailService: EmailService;

  @Post('/test')
  public async test(
    @Body('receiver')
    receiver
  ) {
    const userId = super.getUserId();
    await this.emailService.test(userId, receiver);
    return this.ok({});
  }
}
