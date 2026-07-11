import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { merge } from "lodash-es";
import { CrudController } from "@certd/lib-server";
import { PluginImportReq, PluginService } from "../../../modules/plugin/service/plugin-service.js";
import { CommPluginConfig, PluginConfig, PluginConfigService } from "../../../modules/plugin/service/plugin-config-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";
/**
 * 插件
 */
@Provide()
@Controller("/api/sys/plugin")
export class PluginController extends CrudController<PluginService> {
  @Inject()
  service: PluginService;

  @Inject()
  pluginConfigService: PluginConfigService;

  getService() {
    return this.service;
  }

  getAuditType(): string {
    return AuditType.plugin;
  }

  @Post("/page", { description: "sys:settings:view" })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    return await super.page(body);
  }

  @Post("/list", { description: "sys:settings:view" })
  async list(@Body(ALL) body: any) {
    return super.list(body);
  }

  @Post("/add", { description: "sys:settings:edit", summary: "添加插件" })
  async add(@Body(ALL) bean: any) {
    const def: any = {
      isDefault: false,
      disabled: false,
    };
    merge(bean, def);
    const res = await super.add(bean);
    await this.auditLog({ content: `新增了插件「${bean.name}」(ID:${res.data}, 类型:${bean.type})` });
    return res;
  }

  @Post("/update", { description: "sys:settings:edit", summary: "更新插件" })
  async update(@Body(ALL) bean: any) {
    const res = await super.update(bean);
    await this.auditLog({ content: `修改了插件「${bean.name}」(ID:${bean.id})` });
    return res;
  }

  @Post("/info", { description: "sys:settings:view" })
  async info(@Query("id") id: number) {
    return super.info(id);
  }

  @Post("/delete", { description: "sys:settings:edit", summary: "删除插件" })
  async delete(@Query("id") id: number) {
    const res = await this.service.deleteByIds([id]);
    await this.auditLog({ content: `删除了插件(ID:${id})` });
    return this.ok(res);
  }

  @Post("/deleteByIds", { description: "sys:settings:edit", summary: "批量删除插件" })
  async deleteByIds(@Body("ids") ids: number[]) {
    const res = await this.service.deleteByIds(ids);
    await this.auditLog({ content: `批量删除了${ids.length}条插件` });
    return this.ok(res);
  }

  @Post("/setDisabled", { description: "sys:settings:edit", summary: "禁用/启用插件" })
  async setDisabled(@Body(ALL) body: { id: number; name: string; type: string; disabled: boolean }) {
    await this.service.setDisabled(body);
    const { id, disabled } = body;
    await this.auditLog({ content: `${disabled ? "禁用" : "启用"}了插件(ID:${id})` });
    return this.ok();
  }
  @Post("/getCommPluginConfigs", { description: "sys:settings:view" })
  async getCommPluginConfigs() {
    const res = await this.pluginConfigService.getCommPluginConfig();
    return this.ok(res);
  }

  @Post("/saveCommPluginConfigs", { description: "sys:settings:edit", summary: "保存公共插件配置" })
  async saveCommPluginConfigs(@Body(ALL) body: CommPluginConfig) {
    const res = await this.pluginConfigService.saveCommPluginConfig(body);
    await this.auditLog({ content: "保存了公共插件配置" });
    return this.ok(res);
  }
  @Post("/getPluginByName", { description: "sys:settings:view" })
  async getPluginByName(@Body("name") name: string) {
    const res = await this.pluginConfigService.getPluginConfig({
      name: name,
      type: "builtIn",
    });
    return this.ok(res);
  }

  @Post("/saveSetting", { description: "sys:settings:edit", summary: "保存插件设置" })
  async saveSetting(@Body(ALL) body: PluginConfig) {
    const res = await this.pluginConfigService.savePluginConfig(body);
    await this.auditLog({ content: "保存了插件设置" });
    return this.ok(res);
  }

  @Post("/import", { description: "sys:settings:edit", summary: "导入插件" })
  async import(@Body(ALL) body: PluginImportReq) {
    const res = await this.service.importPlugin(body);
    await this.auditLog({ content: "导入了插件配置" });
    return this.ok(res);
  }

  @Post("/export", { description: "sys:settings:edit", summary: "导出插件" })
  async export(@Body("id") id: number) {
    const res = await this.service.exportPlugin(id);
    return this.ok(res);
  }
}
