import { Provide, Controller, Post, Inject, Body, Query, ALL } from '@midwayjs/core';
import { UserService } from '../service/user-service.js';
import { CrudController } from '../../../basic/crud-controller.js';
import { RoleService } from '../service/role-service.js';
import { PermissionService } from '../service/permission-service.js';
import { Constants } from '../../../basic/constants.js';

/**
 * 系统用户
 */
@Provide()
@Controller('/api/sys/authority/user')
export class UserController extends CrudController<UserService> {
  @Inject()
  service: UserService;

  @Inject()
  roleService: RoleService;
  @Inject()
  permissionService: PermissionService;

  getService() {
    return this.service;
  }

  @Post('/page', { summary: 'sys:auth:user:view' })
  async page(
    @Body(ALL)
    body
  ) {
    const ret = await super.page(body);

    const users = ret.data.records;

    //获取roles
    const userIds = users.map(item => item.id);
    const userRoles = await this.roleService.getByUserIds(userIds);
    const userRolesMap = new Map();
    for (const ur of userRoles) {
      let roles = userRolesMap.get(ur.userId);
      if (roles == null) {
        roles = [];
        userRolesMap.set(ur.userId, roles);
      }
      roles.push(ur.roleId);
    }

    for (const record of users) {
      //withRoles
      record.roles = userRolesMap.get(record.id);
      //删除密码字段
      delete record.password;
    }

    return ret;
  }

  @Post('/add', { summary: 'sys:auth:user:add' })
  async add(
    @Body(ALL)
    bean
  ) {
    return await super.add(bean);
  }

  @Post('/update', { summary: 'sys:auth:user:edit' })
  async update(
    @Body(ALL)
    bean
  ) {
    return await super.update(bean);
  }
  @Post('/delete', { summary: 'sys:auth:user:remove' })
  async delete(
    @Query('id')
    id
  ) {
    return await super.delete(id);
  }

  /**
   * 当前登录用户的个人信息
   */
  @Post('/mine', { summary: Constants.per.authOnly })
  public async mine() {
    const id = this.ctx.user.id;
    const info = await this.service.info(id, ['password']);
    return this.ok(info);
  }

  /**
   * 当前登录用户的权限列表
   */
  @Post('/permissions', { summary: Constants.per.authOnly })
  public async permissions() {
    const id = this.ctx.user.id;
    const permissions = await this.service.getUserPermissions(id);
    return this.ok(permissions);
  }

  /**
   * 当前登录用户的权限树形列表
   */
  @Post('/permissionTree', { summary: Constants.per.authOnly })
  public async permissionTree() {
    const id = this.ctx.user.id;
    const permissions = await this.service.getUserPermissions(id);
    const tree = this.permissionService.buildTree(permissions);
    return this.ok(tree);
  }
}
