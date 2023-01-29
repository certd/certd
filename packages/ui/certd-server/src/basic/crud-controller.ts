import { ALL, Body, Post, Query } from '@midwayjs/decorator';
import { BaseService } from './base-service';
import { BaseController } from './base-controller';

export abstract class CrudController<
  T extends BaseService
> extends BaseController {
  abstract getService();

  @Post('/page')
  async page(
    @Body(ALL)
    body
  ) {
    const pageRet = await this.getService().page(
      body?.query,
      body?.page,
      body?.sort,
      null
    );
    return this.ok(pageRet);
  }

  @Post('/add')
  async add(
    @Body(ALL)
    bean
  ) {
    const id = await this.getService().add(bean);
    return this.ok(id);
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

