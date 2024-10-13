import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { CrudController } from '@certd/lib-server';
import { PermissionService } from '../../../modules/sys/authority/service/permission-service.js';

/**
 * 权限资源
 */
@Provide()
@Controller('/api/sys/authority/permission')
export class PermissionController extends CrudController<PermissionService> {
  @Inject()
  service: PermissionService;

  getService() {
    return this.service;
  }

  @Post('/page', { summary: 'sys:auth:per:view' })
  async page(
    @Body(ALL)
    body
  ) {
    return await super.page(body);
  }

  @Post('/add', { summary: 'sys:auth:per:add' })
  async add(
    @Body(ALL)
    bean
  ) {
    return await super.add(bean);
  }

  @Post('/update', { summary: 'sys:auth:per:edit' })
  async update(
    @Body(ALL)
    bean
  ) {
    return await super.update(bean);
  }
  @Post('/delete', { summary: 'sys:auth:per:remove' })
  async delete(
    @Query('id')
    id: number
  ) {
    return await super.delete(id);
  }

  @Post('/tree', { summary: 'sys:auth:per:view' })
  async tree() {
    const tree = await this.service.tree({});
    return this.ok(tree);
  }
}
