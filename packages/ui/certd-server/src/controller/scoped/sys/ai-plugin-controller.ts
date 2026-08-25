import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { BaseController } from "@certd/lib-server";
import { PluginFindReq, PluginImportReq, PluginService } from "../../../modules/plugin/service/plugin-service.js";
import { HistoryService } from "../../../modules/pipeline/service/history-service.js";
import { PipelineService } from "../../../modules/pipeline/service/pipeline-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";
import { isPlus } from "@certd/plus-core";

@Provide()
@Controller("/api/scoped/sys/ai/plugin")
export class AiPluginController extends BaseController {
  @Inject()
  service: PluginService;

  @Inject()
  pipelineService: PipelineService;

  @Inject()
  historyService: HistoryService;

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
    if (res && res.vip && res.vip !== "free" && !isPlus()) {
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

  @Post("/pipeline/trigger", { description: "sys:settings:edit", summary: "AI 触发流水线测试" })
  async triggerPipeline(@Body(ALL) body: { pipelineId: number; taskId?: string }) {
    const pipelineId = Number(body?.pipelineId);
    const taskId = body?.taskId;
    await this.checkOwner(this.pipelineService, pipelineId, "write", true);
    const { historyId } = await this.pipelineService.trigger(pipelineId, taskId);
    return this.ok({ pipelineId, taskId, historyId });
  }

  @Post("/pipeline/status", { description: "sys:settings:view", summary: "AI 查询流水线测试状态" })
  async pipelineStatus(@Body(ALL) body: { pipelineId: number; historyId?: number; plugin?: string }) {
    const pipelineId = Number(body?.pipelineId);
    await this.checkOwner(this.pipelineService, pipelineId, "read", true);
    const historyId = Number(body?.historyId);
    const history = historyId ? await this.historyService.info(historyId) : await this.historyService.getLastHistory(pipelineId);
    if (history && history.pipelineId !== pipelineId) {
      return this.fail("执行记录不属于当前流水线");
    }
    if (!history) {
      return this.ok({ pipelineId, historyId: null, pipelineStatus: "none", currentTask: null, pluginTask: null, logs: {} });
    }
    const pipeline = JSON.parse(history.pipeline || "{}");
    const plugin = String(body?.plugin || "").toLowerCase();
    let currentTask: any = null;
    let pluginTask: any = null;
    const logs: any = {};
    const visit = (value: any) => {
      if (!value || typeof value !== "object") return;
      if (value.runnableType === "task" && value.status?.result === "running") currentTask = value;
      if (value.runnableType === "task" && plugin && JSON.stringify(value).toLowerCase().includes(plugin)) pluginTask = value;
      if (value.id && value.runnableType === "step" && plugin && JSON.stringify(value).toLowerCase().includes(plugin)) logs[value.id] = true;
      Object.values(value).forEach(visit);
    };
    visit(pipeline);
    const detail: any = await this.historyService.detail(history.id);
    const rawLogs = detail.log?.logs ? JSON.parse(detail.log.logs) : {};
    const pluginLogs = Object.keys(logs).reduce((result, key) => ({ ...result, [key]: rawLogs[key] || [] }), {});
    return this.ok({ pipelineId, historyId: history.id, pipelineStatus: pipeline.status?.result || history.status, currentTask, pluginTask, logs: pluginLogs });
  }
}
