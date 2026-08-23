import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { BaseController } from "@certd/lib-server";
import { PluginFindReq, PluginImportReq, PluginService } from "../../../modules/plugin/service/plugin-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";
import { isPlus } from "@certd/plus-core";

@Provide()
@Controller("/api/scoped/sys/ai/plugin")
export class AiPluginController extends BaseController {
  @Inject()
  service: PluginService;

  getAuditType(): string {
    return AuditType.plugin.value;
  }

  @Post("/find", { description: "sys:settings:view", summary: "AI 查询插件" })
  async find(@Body(ALL) body: PluginFindReq) {
    const res = await this.service.findPlugins(body || {});
    return this.ok(res);
  }

  @Post("/info", { description: "sys:settings:view", summary: "AI 查询插件信息" })
  async info(@Query("id") id: number) {
    const res = await this.service.info(id);
    if (res && res.vip && res.vip!=='free' && !isPlus()) {
        return this.fail("查看该插件的源代码需要专业版及以上");
    }
    return this.ok(res);
  }

  @Post("/export", { description: "sys:settings:view", summary: "AI 导出插件" })
  async export(@Body("id") id: number) {
    const res = await this.service.exportPlugin(id);
    return this.ok(res);
  }

  @Post("/import", { description: "sys:settings:edit", summary: "AI 导入插件" })
  async import(@Body(ALL) body: PluginImportReq) {
    const res = await this.service.importPlugin(body);
    this.auditLog({ content: "AI 导入了插件配置" });
    return this.ok(res);
  }
}
