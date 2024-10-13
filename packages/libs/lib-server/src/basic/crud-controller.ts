import { ALL, Body, Post, Query } from '@midwayjs/core';
import { BaseController } from './base-controller.js';

export abstract class CrudController<T> extends BaseController {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  abstract getService<T>();

  @Post('/page')
  async page(@Body(ALL) body: any) {
    const pageRet = await this.getService().page({
      query: body.query ?? {},
      page: body.page,
      sort: body.sort,
      bq: body.bq,
    });
    return this.ok(pageRet);
  }

  @Post('/list')
  async list(@Body(ALL) body: any) {
    const listRet = await this.getService().list({
      query: body.query ?? {},
      order: body.order,
    });
    return this.ok(listRet);
  }

  @Post('/add')
  async add(@Body(ALL) bean: any) {
    delete bean.id;
    const id = await this.getService().add(bean);
    return this.ok(id);
  }

  @Post('/info')
  async info(@Query('id') id: number) {
    const bean = await this.getService().info(id);
    return this.ok(bean);
  }

  @Post('/update')
  async update(@Body(ALL) bean: any) {
    await this.getService().update(bean);
    return this.ok(null);
  }

  @Post('/delete')
  async delete(@Query('id') id: number) {
    await this.getService().delete([id]);
    return this.ok(null);
  }
}
