import { BaseController, Constants } from "@certd/lib-server";
import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { ApiTags } from "@midwayjs/swagger";
import { AuditService } from "../../../modules/sys/enterprise/service/audit-service.js";
import { buildAuditTypeDict, buildAuditActionDict } from "../../../modules/sys/enterprise/service/audit-constants.js";

@Provide()
@ApiTags(["audit"])
@Controller("/api/sys/audit")
export class SysAuditLogController extends BaseController {
  @Inject()
  auditService: AuditService;

  @Post("/page", { description: Constants.per.authOnly, summary: "分页查询审计日志" })
  async page(@Body(ALL) body: any) {
    const pageRet = await this.auditService.page(body);
    return this.ok(pageRet);
  }

  @Post("/delete", { description: Constants.per.authOnly })
  async delete(@Query("id") id: number) {
    await this.auditService.delete(id);
    return this.ok({});
  }

  @Post("/clean", { description: Constants.per.authOnly })
  async clean(@Body("retentionDays") retentionDays: number) {
    const count = await this.auditService.cleanExpired(retentionDays || 90);
    return this.ok({ deletedCount: count });
  }

  @Post("/dict", { description: Constants.per.authOnly, summary: "获取审计类型和动作字典" })
  async getDict() {
    return this.ok({
      types: buildAuditTypeDict(),
      actions: buildAuditActionDict(),
    });
  }
}
