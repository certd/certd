import {
  ALL,
  Body,
  Controller,
  Inject,
  Post,
  Provide,
} from '@midwayjs/decorator';
import { BaseController } from '../../../basic/base-controller';
import { Constants } from '../../../basic/constants';
import { UserService } from '../../authority/service/user-service';

/**
 */
@Provide()
@Controller('/api/mine')
export class MineController extends BaseController {
  @Inject()
  userService: UserService;
  @Post('/info', { summary: Constants.per.authOnly })
  public async info() {
    const userId = this.getUserId();
    const user = await this.userService.info(userId);
    delete user.password;
    return this.ok(user);
  }

  @Post('/changePassword', { summary: Constants.per.authOnly })
  public async changePassword(@Body(ALL) body: any) {
    const userId = this.getUserId();
    await this.userService.changePassword(userId, body);
    return this.ok({});
  }
}
