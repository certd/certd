import {
  Body,
  Controller,
  Inject,
  Post,
  Provide,
  ALL,
} from '@midwayjs/decorator';
import { LoginService } from '../service/login-service';
import { BaseController } from '../../../basic/base-controller';
import { Constants } from '../../../basic/constants';

/**
 */
@Provide()
@Controller('/api/')
export class LoginController extends BaseController {
  @Inject()
  loginService: LoginService;
  @Post('/login', { summary: Constants.per.guest })
  public async login(
    @Body(ALL)
    user
  ) {
    const token = await this.loginService.login(user);
    return this.ok(token);
  }

  @Post('/logout', { summary: Constants.per.authOnly })
  public logout() {}
}
