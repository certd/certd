import {
  Body,
  Controller,
  Inject,
  Post,
  Provide,
  ALL,
} from '@midwayjs/core';
import { LoginService } from '../service/login-service.js';
import { BaseController } from '../../../basic/base-controller.js';
import { Constants } from '../../../basic/constants.js';

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

    this.ctx.cookies.set('token', token.token, {
      maxAge: 1000 * token.expire,
    });

    return this.ok(token);
  }

  @Post('/logout', { summary: Constants.per.authOnly })
  public logout() {}
}
