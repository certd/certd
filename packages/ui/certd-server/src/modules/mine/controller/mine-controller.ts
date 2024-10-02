import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController } from '../../../basic/base-controller.js';
import { Constants } from '../../../basic/constants.js';
import { UserService } from '../../authority/service/user-service.js';
import { getPlusInfo } from '@certd/pipeline';
import { RoleService } from '../../authority/service/role-service.js';

/**
 */
@Provide()
@Controller('/api/mine')
export class MineController extends BaseController {
  @Inject()
  userService: UserService;
  @Inject()
  roleService: RoleService;
  @Post('/info', { summary: Constants.per.authOnly })
  public async info() {
    const userId = this.getUserId();
    const user = await this.userService.info(userId);
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

  @Post('/plusInfo', { summary: Constants.per.authOnly })
  async plusInfo(@Body(ALL) body) {
    const info = getPlusInfo();
    return this.ok({
      ...info,
    });
  }
}
