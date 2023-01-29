import {
  ALL,
  Body,
  Controller,
  Inject,
  Post,
  Provide,
  Query,
} from '@midwayjs/decorator';
import { CrudController } from '../../../basic/crud-controller';
import { RoleService } from '../service/role-service';

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

  @Post('/page')
  async page(
    @Body(ALL)
    body
  ) {
    return await super.page(body);
  }

  @Post('/list')
  async list() {
    const ret = await this.service.find({});
    return this.ok(ret);
  }

  @Post('/add')
  async add(
    @Body(ALL)
    bean
  ) {
    return await super.add(bean);
  }

  @Post('/update')
  async update(
    @Body(ALL)
    bean
  ) {
    return await super.update(bean);
  }
  @Post('/delete')
  async delete(
    @Query('id')
    id
  ) {
    return await super.delete(id);
  }

  @Post('/getPermissionTree')
  async getPermissionTree(
    @Query('id')
    id
  ) {
    const ret = await this.service.getPermissionTreeByRoleId(id);
    return this.ok(ret);
  }

  @Post('/getPermissionIds')
  async getPermissionIds(
    @Query('id')
    id
  ) {
    const ret = await this.service.getPermissionIdsByRoleId(id);
    return this.ok(ret);
  }

  /**
   * 给角色授予权限
   * @param id
   */
  @Post('/authz')
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

