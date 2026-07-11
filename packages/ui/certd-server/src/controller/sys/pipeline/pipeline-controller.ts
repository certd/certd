import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { CrudController } from "@certd/lib-server";
import { ApiTags } from "@midwayjs/swagger";
import { PipelineService } from "../../../modules/pipeline/service/pipeline-service.js";
import { checkPlus } from "@certd/plus-core";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

@Provide()
@Controller("/api/sys/pipeline")
@ApiTags(["sys-pipeline"])
export class SysPipelineController extends CrudController<PipelineService> {
  @Inject()
  service: PipelineService;

  getService(): PipelineService {
    return this.service;
  }

  getAuditType(): string {
    return AuditType.pipeline;
  }

  @Post("/page", { description: "sys:settings:view", summary: "管理员查询用户流水线分页列表" })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    const title = body.query.title;
    delete body.query.title;

    if (!body.sort || !body.sort?.prop) {
      body.sort = { prop: "order", asc: false };
    }

    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery: bq => {
        if (title) {
          bq.andWhere("(title like :title or content like :content)", { title: `%${title}%`, content: `%${title}%` });
        }
      },
    });
    return this.ok(res);
  }

  @Post("/delete", { description: "sys:settings:edit", summary: "管理员删除用户流水线" })
  async delete(@Query("id") id: number) {
    await this.service.delete(id);
    await this.auditLog({ content: `管理员删除了用户流水线(ID:${id})` });
    return this.ok();
  }

  @Post("/batchDelete", { description: "sys:settings:edit", summary: "管理员批量删除用户流水线" })
  async batchDelete(@Body("ids") ids: number[]) {
    checkPlus();
    const count = ids.length;
    await this.service.batchDelete(ids);
    await this.auditLog({ content: `管理员批量删除了${count}条用户流水线` });
    return this.ok();
  }
}
