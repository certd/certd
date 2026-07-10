import { BaseController, Constants } from "@certd/lib-server";
import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { ApiTags } from "@midwayjs/swagger";
import { AuditService } from "../../../modules/sys/enterprise/service/audit-service.js";
import { buildAuditTypeDict, buildAuditActionDict } from "../../../modules/sys/enterprise/service/audit-constants.js";

@Provide()
@ApiTags(["audit"])
@Controller("/api/pi/audit")
export class AuditLogController extends BaseController {
  @Inject()
  auditService: AuditService;

  @Post("/page", { description: Constants.per.authOnly, summary: "分页查询当前用户操作日志" })
  async page(@Body(ALL) body: any) {
    const userId = this.getUserId();
    if (!body.query) {
      body.query = {};
    }
    body.query.userId = userId;
    const pageRet = await this.auditService.page(body);
    return this.ok(pageRet);
  }

  @Post("/dict", { description: Constants.per.authOnly, summary: "获取审计类型和动作字典" })
  async getDict() {
    return this.ok({
      types: buildAuditTypeDict(),
      actions: buildAuditActionDict(),
    });
  }
}
