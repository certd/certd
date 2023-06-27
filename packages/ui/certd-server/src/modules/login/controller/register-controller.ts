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
import { UserEntity } from '../../authority/entity/user';

/**
 */
@Provide()
@Controller('/api/')
export class RegisterController extends BaseController {
  @Inject()
  userService: UserService;
  @Post('/register', { summary: Constants.per.guest })
  public async register(
    @Body(ALL)
    user: UserEntity
  ) {
    const newUser = await this.userService.register(user);
    return this.ok(newUser);
  }
}
