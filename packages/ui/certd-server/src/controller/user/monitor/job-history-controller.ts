import { Constants, CrudController } from "@certd/lib-server";
import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { ApiTags } from "@midwayjs/swagger";
import { SiteInfoService } from "../../../modules/monitor/index.js";
import { JobHistoryService } from "../../../modules/monitor/service/job-history-service.js";
import { AuthService } from "../../../modules/sys/authority/service/auth-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

/**
 */
@Provide()
@Controller("/api/monitor/job-history")
@ApiTags(["monitor"])
export class JobHistoryController extends CrudController<JobHistoryService> {
  @Inject()
  service: JobHistoryService;
  @Inject()
  authService: AuthService;
  @Inject()
  siteInfoService: SiteInfoService;

  getService(): JobHistoryService {
    return this.service;
  }

  getAuditType(): string {
    return AuditType.jobHistory.value;
  }

  @Post("/page", { description: Constants.per.authOnly, summary: "查询监控运行历史分页列表" })
  async page(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.userId = userId;
    body.query.projectId = projectId;
    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
    });
    return this.ok(res);
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询监控运行历史列表" })
  async list(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query.userId = userId;
    body.query.projectId = projectId;
    return await super.list(body);
  }

  @Post("/info", { description: Constants.per.authOnly, summary: "查询监控运行历史详情" })
  async info(@Query("id") id: number) {
    await this.checkOwner(this.service, id, "read");
    return await super.info(id);
  }

  @Post("/delete", { description: Constants.per.authOnly, summary: "删除监控运行历史" })
  async delete(@Query("id") id: number) {
    await this.checkOwner(this.service, id, "write");
    const res = await super.delete(id);
    this.auditLog({ content: `删除了监控运行历史(ID:${id})` });
    return res;
  }
  @Post("/batchDelete", { description: Constants.per.authOnly, summary: "批量删除监控运行历史" })
  async batchDelete(@Body("ids") ids: number[]) {
    const { projectId, userId } = await this.getProjectUserIdWrite();
    await this.service.batchDelete(ids, userId, projectId);
    this.auditLog({ content: `批量删除了${ids.length}条监控运行历史` });
    return this.ok();
  }
}
