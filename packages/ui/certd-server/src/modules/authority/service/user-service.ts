import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entity/user.js';
import * as _ from 'lodash-es';
import md5 from 'md5';
import { CommonException } from '../../../basic/exception/common-exception.js';
import { BaseService } from '../../../basic/base-service.js';
import { RoleService } from './role-service.js';
import { PermissionService } from './permission-service.js';
import { UserRoleService } from './user-role-service.js';
import { Constants } from '../../../basic/constants.js';
import { UserRoleEntity } from '../entity/user-role.js';
import { randomText } from 'svg-captcha';
import bcrypt from 'bcryptjs';
import { SysSettingsService } from '../../system/service/sys-settings-service.js';
import { SysInstallInfo } from '../../system/service/models.js';

/**
 * 系统用户
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class UserService extends BaseService<UserEntity> {
  @InjectEntityModel(UserEntity)
  repository: Repository<UserEntity>;
  @Inject()
  roleService: RoleService;
  @Inject()
  permissionService: PermissionService;
  @Inject()
  userRoleService: UserRoleService;

  @Inject()
  sysSettingsService: SysSettingsService;

  getRepository() {
    return this.repository;
  }

  /**
   * 获得个人信息
   */
  async mine(userId: number) {
    const info = await this.repository.findOne({
      where: {
        id: userId,
      },
    });
    delete info.password;
    return info;
  }

  /**
   * 新增
   * @param param
   */
  async add(param) {
    const exists = await this.repository.findOne({
      where: {
        username: param.username,
      },
    });
    if (!_.isEmpty(exists)) {
      throw new CommonException('用户名已经存在');
    }
    const plainPassword = param.password ?? randomText(6);
    param.passwordVersion = 2;
    param.password = await this.genPassword(plainPassword, param.passwordVersion); // 默认密码  建议未改密码不能登陆
    await super.add(param);
    //添加角色
    if (param.roles && param.roles.length > 0) {
      await this.roleService.addRoles(param.id, param.roles);
    }
    return param.id;
  }

  /**
   * 修改
   * @param param 数据
   */
  async update(param) {
    if (param.id == null) {
      throw new CommonException('id不能为空');
    }
    const userInfo = await this.repository.findOne({
      where: { id: param.id },
    });
    if (!userInfo) {
      throw new CommonException('用户不存在');
    }

    delete param.username;
    if (!_.isEmpty(param.password)) {
      param.passwordVersion = 2;
      param.password = await this.genPassword(param.password, param.passwordVersion);
    } else {
      delete param.password;
    }
    await super.update(param);
    await this.roleService.updateRoles(param.id, param.roles);
  }

  private async genPassword(rawPassword: any, passwordVersion: number) {
    if (passwordVersion == null || passwordVersion <= 1) {
      return md5(rawPassword);
    }
    const salt = bcrypt.genSaltSync(10);
    const plainPassword = await this.buildPlainPassword(rawPassword);
    return bcrypt.hashSync(plainPassword, salt);
  }

  async findOne(param: any) {
    return this.repository.findOne({
      where: param,
    });
  }

  async checkPassword(rawPassword: any, hashPassword: any, passwordVersion: number) {
    if (passwordVersion == null || passwordVersion <= 1) {
      return (await this.genPassword(rawPassword, passwordVersion)) === hashPassword;
    }
    const plainPassword = await this.buildPlainPassword(rawPassword);
    return bcrypt.compareSync(plainPassword, hashPassword);
  }

  async buildPlainPassword(rawPassword: string) {
    const setting: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    const prefixSiteId = setting.siteId.substring(1, 5);
    return rawPassword + prefixSiteId;
  }

  /**
   * 获取用户的菜单资源列表
   * @param id
   */
  async getUserPermissions(id: any) {
    const roleIds = await this.roleService.getRoleIdsByUserId(id);
    return await this.roleService.getPermissionByRoleIds(roleIds);
  }

  async register(user: UserEntity) {
    const old = await this.findOne({ username: user.username });
    if (old != null) {
      throw new CommonException('用户名已经存在');
    }
    let newUser: UserEntity = UserEntity.of({
      username: user.username,
      password: user.password,
      nickName: user.nickName || user.username,
      avatar: user.avatar || '',
      email: user.email || '',
      mobile: user.mobile || '',
      phoneCode: user.phoneCode || '',
      status: 1,
      passwordVersion: 2,
    });
    if (!newUser.password) {
      newUser.password = randomText(6);
    }
    newUser.password = await this.genPassword(newUser.password, newUser.passwordVersion);

    await this.transaction(async txManager => {
      newUser = await txManager.save(newUser);
      const userRole: UserRoleEntity = UserRoleEntity.of(newUser.id, Constants.role.defaultUser);
      await txManager.save(userRole);
    });

    delete newUser.password;
    return newUser;
  }

  async changePassword(userId: any, form: any) {
    const user = await this.info(userId);
    const passwordChecked = await this.checkPassword(form.password, user.password, user.passwordVersion);
    if (!passwordChecked) {
      throw new CommonException('原密码错误');
    }
    const param = {
      id: userId,
      password: form.newPassword,
    };

    await this.update(param);
  }

  async resetPassword(userId: any, newPasswd: string) {
    const param = {
      id: userId,
      password: newPasswd,
    };
    await this.update(param);
  }

  async delete(ids: any) {
    if (typeof ids === 'string') {
      ids = ids.split(',');
      ids = ids.map(id => parseInt(id));
    }
    if (ids instanceof Array) {
      if (ids.includes(1)) {
        throw new CommonException('不能删除管理员');
      }
    }
    await super.delete(ids);
  }
}
