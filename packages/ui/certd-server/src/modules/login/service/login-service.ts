import { Config, Inject, Provide } from '@midwayjs/core';
import { UserService } from '../../authority/service/user-service.js';
import jwt from 'jsonwebtoken';
import { CommonException } from '../../../basic/exception/common-exception.js';
import { RoleService } from '../../authority/service/role-service.js';
import { UserEntity } from '../../authority/entity/user.js';
import { SysSettingsService } from '../../system/service/sys-settings-service.js';
import { SysPrivateSettings } from '../../system/service/models.js';

/**
 * 系统用户
 */
@Provide()
export class LoginService {
  @Inject()
  userService: UserService;
  @Inject()
  roleService: RoleService;
  @Config('auth.jwt')
  private jwt: any;

  @Inject()
  sysSettingsService: SysSettingsService;

  /**
   * login
   */
  async login(user) {
    console.assert(user.username != null, '用户名不能为空');
    const info = await this.userService.findOne({ username: user.username });
    if (info == null) {
      throw new CommonException('用户名或密码错误');
    }
    const right = await this.userService.checkPassword(user.password, info.password, info.passwordVersion);
    if (!right) {
      throw new CommonException('用户名或密码错误');
    }

    const roleIds = await this.roleService.getRoleIdsByUserId(info.id);
    return this.generateToken(info, roleIds);
  }

  /**
   * 生成token
   * @param user 用户对象
   * @param roleIds
   */
  async generateToken(user: UserEntity, roleIds: number[]) {
    const tokenInfo = {
      username: user.username,
      id: user.id,
      roles: roleIds,
    };
    const expire = this.jwt.expire;

    const setting = await this.sysSettingsService.getSetting<SysPrivateSettings>(SysPrivateSettings);
    const jwtSecret = setting.jwtKey;

    const token = jwt.sign(tokenInfo, jwtSecret, {
      expiresIn: expire,
    });

    return {
      token,
      expire,
    };
  }
}
