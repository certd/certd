import { BaseController } from "@certd/lib-server";
import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { ApiTags } from "@midwayjs/swagger";
import { AuditService } from "../../../modules/sys/enterprise/service/audit-service.js";
import { buildAuditTypeDict, buildAuditActionDict } from "../../../modules/sys/enterprise/service/audit-constants.js";

@Provide()
@ApiTags(["audit"])
@Controller("/api/sys/audit")
export class SysAuditLogController extends BaseController {
  @Inject()
  auditService: AuditService;

  @Post("/page", { description: "sys:settings:view", summary: "分页查询审计日志" })
  async page(@Body(ALL) body: any) {
    if (body.query?.scope) {
      delete body.query.userId;
    }
    const pageRet = await this.auditService.page(body);
    return this.ok(pageRet);
  }

  @Post("/clean", { description: "sys:settings:edit", summary: "清理过期审计日志" })
  async clean() {
    const count = await this.auditService.cleanExpired(90);
    return this.ok({ deletedCount: count });
  }

  @Post("/dict", { description: "sys:settings:view", summary: "获取审计类型和动作字典" })
  async getDict() {
    return this.ok({
      types: buildAuditTypeDict(),
      actions: buildAuditActionDict(),
    });
  }
}
