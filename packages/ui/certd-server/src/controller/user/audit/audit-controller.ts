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
    const { projectId, userId } = await this.getProjectUserIdRead();
    const query: any = {};
    if (projectId) {
      //如果是项目级别，排除userId参数，因为日志这里userId不是-1 ，而是实际的用户
      query.projectId = projectId;
    } else {
      query.userId = userId;
    }
    body.query = {
      ...(body.query || {}),
      ...query,
      scope: "user",
    };

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
