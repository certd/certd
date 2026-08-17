import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { BaseController } from "@certd/lib-server";
import { LoginService } from "../../../modules/login/service/login-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

const AI_PLUGIN_TOKEN_SCOPE = "sys/ai";

@Provide()
@Controller("/api/sys/basic")
export class SysBasicController extends BaseController {
  @Inject()
  loginService: LoginService;

  getAuditType(): string {
    return AuditType.settings.value;
  }

  @Post("/getScopedAccessToken", { description: "sys:settings:edit", summary: "获取 AI 插件开发访问令牌" })
  async getScopedAccessToken(@Body(ALL) body: { scoped?: string[] }) {
    const scoped = body?.scoped || [];
    if (!Array.isArray(scoped) || scoped.length !== 1 || scoped[0] !== AI_PLUGIN_TOKEN_SCOPE) {
      throw new Error(`仅支持申请 ${AI_PLUGIN_TOKEN_SCOPE} 范围的访问令牌`);
    }
    const user = this.ctx.user;
    if (!user?.id || !user.username || !Array.isArray(user.roles)) {
      throw new Error("当前登录令牌不支持申请受限访问令牌");
    }
    const res = await this.loginService.generateScopedAccessToken(user, scoped);
    this.auditLog({ content: "获取了 AI 插件开发受限访问令牌" });
    return this.ok(res);
  }
}
