import {
  ALL,
  Body,
  Controller,
  Inject,
  Post,
  Provide,
  Query,
} from '@midwayjs/core';
import { CrudController } from '../../../basic/crud-controller.js';
import { RoleService } from '../service/role-service.js';

/**
 * 系统用户
 */
@Provide()
@Controller('/api/sys/authority/role')
export class RoleController extends CrudController<RoleService> {
  @Inject()
  service: RoleService;

  getService() {
    return this.service;
  }

  @Post('/page', { summary: 'sys:auth:role:view' })
  async page(
    @Body(ALL)
    body
  ) {
    return await super.page(body);
  }

  @Post('/list', { summary: 'sys:auth:role:view' })
  async list() {
    const ret = await this.service.find({});
    return this.ok(ret);
  }

  @Post('/add', { summary: 'sys:auth:role:add' })
  async add(
    @Body(ALL)
    bean
  ) {
    return await super.add(bean);
  }

  @Post('/update', { summary: 'sys:auth:role:edit' })
  async update(
    @Body(ALL)
    bean
  ) {
    return await super.update(bean);
  }
  @Post('/delete', { summary: 'sys:auth:role:remove' })
  async delete(
    @Query('id')
    id
  ) {
    return await super.delete(id);
  }

  @Post('/getPermissionTree', { summary: 'sys:auth:role:view' })
  async getPermissionTree(
    @Query('id')
    id
  ) {
    const ret = await this.service.getPermissionTreeByRoleId(id);
    return this.ok(ret);
  }

  @Post('/getPermissionIds', { summary: 'sys:auth:role:view' })
  async getPermissionIds(
    @Query('id')
    id
  ) {
    const ret = await this.service.getPermissionIdsByRoleId(id);
    return this.ok(ret);
  }

  /**
   * 给角色授予权限
   * @param roleId
   * @param permissionIds
   */
  @Post('/authz', { summary: 'sys:auth:role:edit' })
  async authz(
    @Body('roleId')
    roleId,
    @Body('permissionIds')
    permissionIds
  ) {
    await this.service.authz(roleId, permissionIds);
    return this.ok(null);
  }
}
