import { BaseController, Constants } from '@certd/lib-server';
import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { PasskeyService } from '../../../modules/login/service/passkey-service.js';
import { RoleService } from '../../../modules/sys/authority/service/role-service.js';
import { UserService } from '../../../modules/sys/authority/service/user-service.js';
import { ApiTags } from '@midwayjs/swagger';

/**
 */
@Provide()
@Controller('/api/mine')
@ApiTags(['mine'])
export class MineController extends BaseController {
  @Inject()
  userService: UserService;

  @Inject()
  roleService: RoleService;

  @Inject()
  passkeyService: PasskeyService;


  @Post('/info', { summary: Constants.per.authOnly })
  public async info() {
    const userId = this.getUserId();
    const user = await this.userService.info(userId);
    const isWeak = await this.userService.checkPassword('123456', user.password, user.passwordVersion);
    if (isWeak) {
      //@ts-ignore
      user.isWeak = true;
    }
    user.roleIds = await this.roleService.getRoleIdsByUserId(userId);
    delete user.password;
    return this.ok(user);
  }

  @Post('/changePassword', { summary: Constants.per.authOnly })
  public async changePassword(@Body(ALL) body: any) {
    const userId = this.getUserId();
    await this.userService.changePassword(userId, body);
    return this.ok({});
  }

  @Post('/updateProfile', { summary: Constants.per.authOnly })
  public async updateProfile(@Body(ALL) body: any) {
    const userId = this.getUserId();
  
    await this.userService.updateProfile(userId, {
      avatar: body.avatar,
      nickName: body.nickName,
    });
    return this.ok({});
  }
}
