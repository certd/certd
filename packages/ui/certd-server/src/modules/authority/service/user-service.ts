import { Inject, Provide } from '@midwayjs/decorator';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entity/user';
import * as _ from 'lodash';
import * as md5 from 'md5';
import { CommonException } from '../../../basic/exception/common-exception';
import { BaseService } from '../../../basic/base-service';
import { logger } from '../../../utils/logger';
import { RoleService } from './role-service';
import { PermissionService } from './permission-service';
import { UserRoleService } from './user-role-service';

/**
 * 系统用户
 */
@Provide()
export class UserService extends BaseService {
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
  async mine() {
    const info = await this.repository.findOne({
      where: {
        id: this.ctx.user.id,
      }
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
      where:{
        username: param.username,
      }
    });
    if (!_.isEmpty(exists)) {
      throw new CommonException('用户名已经存在');
    }
    const password = param.password ?? '123456';
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
      where:{ id: param.id }
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
      where:param
    });
  }

  checkPassword(rawPassword: any, md5Password: any) {
    logger.info('md5', md5('123456'));
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
}
