import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController } from '@certd/lib-server';
import { Constants } from '@certd/lib-server';
import { UserService } from '../../modules/sys/authority/service/user-service.js';
import { UserEntity } from '../../modules/sys/authority/entity/user.js';
import { SysSettingsService } from '@certd/lib-server';

/**
 */
@Provide()
@Controller('/api/')
export class RegisterController extends BaseController {
  @Inject()
  userService: UserService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Post('/register', { summary: Constants.per.guest })
  public async register(
    @Body(ALL)
    user: UserEntity
  ) {
    const sysPublicSettings = await this.sysSettingsService.getPublicSettings();
    if (sysPublicSettings.registerEnabled === false) {
      throw new Error('当前站点已禁止自助注册功能');
    }
    const newUser = await this.userService.register(user);
    return this.ok(newUser);
  }
}
