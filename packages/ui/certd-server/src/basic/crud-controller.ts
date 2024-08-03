import { ALL, Body, Post, Query } from '@midwayjs/core';
import { BaseController } from './base-controller.js';

export abstract class CrudController<T> extends BaseController {
  abstract getService<T>();

  @Post('/page')
  async page(
    @Body(ALL)
    body
  ) {
    const pageRet = await this.getService().page(body?.query, body?.page, body?.sort, null);
    return this.ok(pageRet);
  }

  @Post('/list')
  async list(
    @Body(ALL)
    body
  ) {
    const listRet = await this.getService().list(body, null, null);
    return this.ok(listRet);
  }

  @Post('/add')
  async add(
    @Body(ALL)
    bean
  ) {
    delete bean.id;
    const id = await this.getService().add(bean);
    return this.ok(id);
  }

  @Post('/info')
  async info(
    @Query('id')
    id
  ) {
    const bean = await this.getService().info(id);
    return this.ok(bean);
  }

  @Post('/update')
  async update(
    @Body(ALL)
    bean
  ) {
    await this.getService().update(bean);
    return this.ok(null);
  }

  @Post('/delete')
  async delete(
    @Query('id')
    id
  ) {
    await this.getService().delete([id]);
    return this.ok(null);
  }
}
