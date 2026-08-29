import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { merge } from "lodash-es";
import { CrudController } from "@certd/lib-server";
import {
  OnlinePluginAuthorAddReq,
  OnlinePluginAuthorUpdateReq,
  OnlinePluginDependenciesReq,
  OnlinePluginInstallReq,
  OnlinePluginListReq,
  OnlinePluginPublishInfoReq,
  OnlinePluginPublishReq,
  OnlinePluginVersionSubmitReq,
  PluginFindReq,
  PluginImportReq,
  PluginService,
} from "../../../modules/plugin/service/plugin-service.js";
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
    return AuditType.plugin.value;
  }

  @Post("/page", { description: "sys:settings:view" })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    return await super.page(body);
  }

  @Post("/find", { description: "sys:settings:view", summary: "查询插件" })
  async find(@Body(ALL) body: PluginFindReq) {
    const res = await this.service.findPlugins(body || {});
    return this.ok(res);
  }

  @Post("/add", { description: "sys:settings:edit", summary: "添加插件" })
  async add(@Body(ALL) bean: any) {
    const def: any = {
      isDefault: false,
      disabled: false,
      type: "store",
    };
    merge(bean, def);
    bean.fullName = bean.name;
    if (bean.author) {
      bean.fullName = bean.author + "/" + bean.name;
    }
    const res = await super.add(bean);
    await this.auditLog({ content: `新增了插件「${bean.name}」(ID:${res.data}, 类型:${bean.type})` });
    return res;
  }

  @Post("/update", { description: "sys:settings:edit", summary: "更新插件" })
  async update(@Body(ALL) bean: any) {
    await this.service.ensurePluginEditable(bean.id);
    const res = await super.update(bean);
    await this.auditLog({ content: `修改了插件「${bean.name}」(ID:${bean.id})` });
    return res;
  }

  @Post("/info", { description: "sys:settings:view" })
  async info(@Query("id") id: number) {
    return this.ok(await this.service.infoWithEditable(id));
  }

  @Post("/delete", { description: "sys:settings:edit", summary: "删除插件" })
  async delete(@Query("id") id: number) {
    const res = await this.service.deleteByIds([id]);
    await this.auditLog({ content: `删除了插件(ID:${id})` });
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

  @Post("/online/list", { description: "sys:settings:view", summary: "查询在线插件" })
  async onlineList(@Body(ALL) body: OnlinePluginListReq) {
    const res = await this.service.onlinePluginList(body);
    return this.ok(res);
  }

  @Post("/online/dependencies", { description: "sys:settings:view", summary: "查询在线插件依赖" })
  async onlineDependencies(@Body(ALL) body: OnlinePluginDependenciesReq) {
    const res = await this.service.onlinePluginDependencies(body);
    return this.ok(res);
  }

  @Post("/online/setting", { description: "sys:settings:view", summary: "查询在线插件同步设置" })
  async onlineSetting() {
    const res = await this.service.getOnlinePluginSetting();
    return this.ok(res);
  }

  @Post("/online/sync", { description: "sys:settings:edit", summary: "同步在线插件" })
  async onlineSync() {
    const res = await this.service.syncOnlinePluginList();
    await this.auditLog({ content: "同步了在线插件市场" });
    return this.ok(res);
  }

  @Post("/online/install", { description: "sys:settings:edit", summary: "安装在线插件" })
  async onlineInstall(@Body(ALL) body: OnlinePluginInstallReq) {
    const res = await this.service.installOnlinePlugin(body);
    await this.auditLog({ content: `安装了在线插件「${body.fullName}」` });
    return this.ok(res);
  }

  @Post("/online/uninstall", { description: "sys:settings:edit", summary: "卸载在线插件" })
  async onlineUninstall(@Body("id") id: number) {
    const res = await this.service.uninstallOnlinePlugin(id);
    await this.auditLog({ content: `卸载了在线插件(ID:${id})` });
    return this.ok(res);
  }

  @Post("/online/version/submit", { description: "sys:settings:edit", summary: "提交在线插件版本" })
  async onlineVersionSubmit(@Body(ALL) body: OnlinePluginVersionSubmitReq) {
    const res = await this.service.submitOnlinePluginVersion(body);
    await this.auditLog({ content: `提交了在线插件「${body.fullName}」的新版本` });
    return this.ok(res);
  }

  @Post("/online/publish", { description: "sys:settings:edit", summary: "发布本地插件到市场" })
  async onlinePublish(@Body(ALL) body: OnlinePluginPublishReq) {
    const res = await this.service.publishLocalPlugin(body);
    await this.auditLog({ content: `发布了本地插件(ID:${body.id})到插件市场` });
    return this.ok(res);
  }

  @Post("/online/author/get", { description: "sys:settings:view", summary: "查询在线插件作者" })
  async onlineAuthorGet() {
    const res = await this.service.getOnlinePluginAuthor();
    return this.ok(res);
  }

  @Post("/online/author/add", { description: "sys:settings:edit", summary: "注册在线插件作者" })
  async onlineAuthorAdd(@Body(ALL) body: OnlinePluginAuthorAddReq) {
    const res = await this.service.addOnlinePluginAuthor(body);
    await this.auditLog({ content: `注册了在线插件作者「${body.name}」` });
    return this.ok(res);
  }

  @Post("/online/author/update", { description: "sys:settings:edit", summary: "修改在线插件作者邮箱" })
  async onlineAuthorUpdate(@Body(ALL) body: OnlinePluginAuthorUpdateReq) {
    return this.ok(await this.service.updateOnlinePluginAuthor(body));
  }

  @Post("/online/publish/info", { description: "sys:settings:view", summary: "查询本地插件发布信息" })
  async onlinePublishInfo(@Body(ALL) body: OnlinePluginPublishInfoReq) {
    const res = await this.service.getOnlinePluginPublishInfo(body);
    return this.ok(res);
  }

  @Post("/export", { description: "sys:settings:edit", summary: "导出插件" })
  async export(@Body("id") id: number) {
    const res = await this.service.exportPlugin(id);
    return this.ok(res);
  }
}
