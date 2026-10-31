import { ALL, Body, Query } from "@midwayjs/core";
import { BaseController } from "./base-controller.js";

export abstract class CrudController<T> extends BaseController {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  abstract getService<T>();

  async page(@Body(ALL) body: any) {
    const pageRet = await this.getService().page({
      query: body.query ?? {},
      page: body.page,
      sort: body.sort,
      bq: body.bq,
    });
    return this.ok(pageRet);
  }

  async list(@Body(ALL) body: any) {
    const listRet = await this.getService().list({
      query: body.query ?? {},
      order: body.order,
    });
    return this.ok(listRet);
  }

  async add(@Body(ALL) bean: any) {
    delete bean.id;
    const { userId, projectId } = await this.getProjectUserIdWrite();
    bean.userId = userId;
    bean.projectId = projectId;
    const id = await this.getService().add(bean);
    return this.ok(id);
  }

  async info(@Query("id") id: number) {
    const bean = await this.getService().info(id);
    return this.ok(bean);
  }

  async update(@Body(ALL) bean: any) {
    await this.checkOwner(this.getService(), bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    await this.getService().update(bean);
    return this.ok(null);
  }

  async delete(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "write");
    await this.getService().delete([id]);
    return this.ok(null);
  }

  async deleteByIds(@Body("ids") ids: number[]) {
    const { userId, projectId } = await this.getProjectUserIdWrite();
    await this.getService().deleteWhere({
      userId,
      projectId,
      id: ids,
    });
    return this.ok(null);
  }
}
