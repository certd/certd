import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { Constants, CrudController } from "@certd/lib-server";
import { ApiTags } from "@midwayjs/swagger";
import { ClientService } from "../../../modules/client/service/client-service.js";

/**
 * 客户端管理接口。
 */
@Provide()
@Controller("/api/client")
@ApiTags(["client"])
export class ClientController extends CrudController<ClientService> {
  @Inject()
  service: ClientService;

  getService(): ClientService {
    return this.service;
  }

  @Post("/page", { description: Constants.per.authOnly, summary: "查询客户端分页列表" })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query.projectId = projectId;
    body.query.userId = userId;
    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
    });
    return this.ok(res);
  }

  @Post("/info", { description: Constants.per.authOnly, summary: "查询客户端详情" })
  async info(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "read");
    const bean = await this.service.info(id);
    return this.ok(bean);
  }

  @Post("/delete", { description: Constants.per.authOnly, summary: "删除客户端记录" })
  async delete(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "write");
    const res = await super.delete(id);
    return res;
  }
}
