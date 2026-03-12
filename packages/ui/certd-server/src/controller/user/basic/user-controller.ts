import { Constants, isEnterprise } from '@certd/lib-server';
import { Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { In } from 'typeorm';
import { AuthService } from '../../../modules/sys/authority/service/auth-service.js';
import { UserService } from '../../../modules/sys/authority/service/user-service.js';
import { BasicController } from '../../basic/code-controller.js';
import { RoleService } from '../../../modules/sys/authority/service/role-service.js';

/**
 * 通知
 */
@Provide()
@Controller('/api/basic/user')
export class BasicUserController extends BasicController {
  @Inject()
  service: UserService;
  @Inject()
  authService: AuthService;
 @Inject()
  roleService: RoleService;

  getService(): UserService {
    return this.service;
  }

  @Post('/getSimpleUserByIds', { summary: Constants.per.authOnly })
  async getSimpleUserByIds(@Body('ids') ids: number[]) {
    if(!isEnterprise()){
       throw new Error('非企业模式不能获取用户信息');
    }
    const users = await this.service.find({
      select: {
        id: true,
        username: true,
        nickName: true,
        mobile: true,
        phoneCode: true,
      },
      where: {
        id: In(ids),
      },
    });
    return this.ok(users);
  }

  @Post('/getSimpleUsers', {summary: Constants.per.authOnly})
  async getSimpleUsers() {
    if(!isEnterprise()){
       throw new Error('非企业模式不能获取所有用户信息');
    }
    const users = await this.service.find({
      select: {
        id: true,
        username: true,
        nickName: true,
        mobile: true,
        phoneCode: true,
      },
    });
    return this.ok(users);
  }

   @Post('/getSimpleRoles', {summary: Constants.per.authOnly})
  async getSimpleRoles() {
    const roles = await this.roleService.find({
      select: {
        id: true,
        name: true,
      },
    });
    return this.ok(roles);
  }

}
