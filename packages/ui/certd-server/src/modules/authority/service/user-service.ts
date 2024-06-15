import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/decorator';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entity/user';
import * as _ from 'lodash';
import md5 from 'md5';
import { CommonException } from '../../../basic/exception/common-exception';
import { BaseService } from '../../../basic/base-service';
import { RoleService } from './role-service';
import { PermissionService } from './permission-service';
import { UserRoleService } from './user-role-service';
import { Constants } from '../../../basic/constants';
import { UserRoleEntity } from '../entity/user-role';
import { randomText } from 'svg-captcha';

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
    const password = param.password ?? randomText(6);
    param.password = md5(password); // 默认密码  建议未改密码不能登陆
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
      param.password = md5(param.password);
    } else {
      delete param.password;
    }
    await super.update(param);
    await this.roleService.updateRoles(param.id, param.roles);
  }

  async findOne(param) {
    return this.repository.findOne({
      where: param,
    });
  }

  checkPassword(rawPassword: any, md5Password: any) {
    // logger.info('md5', md5('123456'));
    return md5(rawPassword) === md5Password;
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
    });
    newUser.password = md5(newUser.password);

    await this.transaction(async txManager => {
      newUser = await txManager.save(newUser);
      const userRole: UserRoleEntity = UserRoleEntity.of(
        newUser.id,
        Constants.role.defaultUser
      );
      await txManager.save(userRole);
    });

    delete newUser.password;
    return newUser;
  }

  async changePassword(userId: any, form: any) {
    const user = await this.info(userId);
    if (!this.checkPassword(form.password, user.password)) {
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
}
