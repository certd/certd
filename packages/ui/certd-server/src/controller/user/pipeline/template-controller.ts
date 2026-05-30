import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { Constants, CrudController } from "@certd/lib-server";
import { TemplateService } from "../../../modules/pipeline/service/template-service.js";
import { checkPlus } from "@certd/plus-core";
import { ApiTags } from "@midwayjs/swagger";

/**
 * 流水线模版
 */
@Provide()
@Controller("/api/pi/template")
@ApiTags(["pipeline-template"])
export class TemplateController extends CrudController<TemplateService> {
  @Inject()
  service: TemplateService;

  getService() {
    return this.service;
  }

  @Post("/page", { description: Constants.per.authOnly, summary: "查询流水线模版分页列表" })
  async page(@Body(ALL) body) {
    body.query = body.query ?? {};
    delete body.query.userId;
    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query.projectId = projectId;

    const buildQuery = qb => {
      qb.andWhere("user_id = :userId", { userId: userId });
    };
    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery,
    });
    return this.ok(res);
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询流水线模版列表" })
  async list(@Body(ALL) body) {
    body.query = body.query ?? {};
    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query.projectId = projectId;
    body.query.userId = userId;
    return super.list(body);
  }

  @Post("/add", { description: Constants.per.authOnly, summary: "添加流水线模版" })
  async add(@Body(ALL) bean) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    bean.userId = userId;
    bean.projectId = projectId;
    checkPlus();
    return super.add(bean);
  }

  @Post("/update", { description: Constants.per.authOnly, summary: "更新流水线模版" })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.service, bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    return super.update(bean);
  }
  @Post("/info", { description: Constants.per.authOnly, summary: "查询流水线模版详情" })
  async info(@Query("id") id: number) {
    await this.checkOwner(this.service, id, "read");
    return super.info(id);
  }

  @Post("/delete", { description: Constants.per.authOnly, summary: "删除流水线模版" })
  async delete(@Query("id") id: number) {
    const { userId, projectId } = await this.getProjectUserIdWrite();
    await this.service.batchDelete([id], userId, projectId);
    return this.ok({});
  }

  @Post("/batchDelete", { description: Constants.per.authOnly, summary: "批量删除流水线模版" })
  async batchDelete(@Body("ids") ids: number[]) {
    const { userId, projectId } = await this.getProjectUserIdWrite();
    await this.service.batchDelete(ids, userId, projectId);
    return this.ok({});
  }

  @Post("/detail", { description: Constants.per.authOnly, summary: "查询流水线模版详情" })
  async detail(@Query("id") id: number) {
    const { userId, projectId } = await this.getProjectUserIdRead();
    const detail = await this.service.detail(id, userId, projectId);
    return this.ok(detail);
  }
  @Post("/createPipelineByTemplate", { description: Constants.per.authOnly, summary: "根据模版创建流水线" })
  async createPipelineByTemplate(@Body(ALL) body: any) {
    const { userId, projectId } = await this.getProjectUserIdWrite();
    body.userId = userId;
    body.projectId = projectId;
    checkPlus();
    const res = await this.service.createPipelineByTemplate(body);
    return this.ok(res);
  }
}
