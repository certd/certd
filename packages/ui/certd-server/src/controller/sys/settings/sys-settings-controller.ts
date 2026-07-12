import { ALL, Body, Controller, Inject, Post, Provide, Query, RequestIP } from "@midwayjs/core";
import { addonRegistry, AddonService, CrudController, SysPrivateSettings, SysPublicSettings, SysSafeSetting, SysSettingsEntity, SysSettingsService } from "@certd/lib-server";
import { cloneDeep, merge } from "lodash-es";
import { PipelineService } from "../../../modules/pipeline/service/pipeline-service.js";
import { UserSettingsService } from "../../../modules/mine/service/user-settings-service.js";
import { getEmailSettings } from "../../../modules/sys/settings/fix.js";
import { http, logger, utils } from "@certd/basic";
import { CodeService } from "../../../modules/basic/service/code-service.js";
import { SmsServiceFactory } from "../../../modules/basic/sms/factory.js";
import { RuntimeDepsService } from "../../../modules/runtime-deps/runtime-deps-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

/**
 */
@Provide()
@Controller("/api/sys/settings")
export class SysSettingsController extends CrudController<SysSettingsService> {
  @Inject()
  service: SysSettingsService;
  @Inject()
  userSettingsService: UserSettingsService;
  @Inject()
  pipelineService: PipelineService;
  @Inject()
  codeService: CodeService;
  @Inject()
  addonService: AddonService;
  @Inject()
  runtimeDepsService: RuntimeDepsService;

  getService() {
    return this.service;
  }

  getAuditType(): string {
    return AuditType.settings.value;
  }

  @Post("/page", { description: "sys:settings:view", summary: "查询系统设置分页列表" })
  async page(@Body(ALL) body) {
    return super.page(body);
  }

  @Post("/list", { description: "sys:settings:view", summary: "查询系统设置列表" })
  async list(@Body(ALL) body) {
    return super.list(body);
  }

  @Post("/add", { description: "sys:settings:edit", summary: "添加系统设置" })
  async add(@Body(ALL) bean) {
    const res = await super.add(bean);
    await this.auditLog({ content: "添加了系统设置" });
    return res;
  }

  @Post("/update", { description: "sys:settings:edit", summary: "更新系统设置" })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.getUserId());
    const res = await super.update(bean);
    await this.auditLog({ content: "更新了系统设置" });
    return res;
  }
  @Post("/info", { description: "sys:settings:view", summary: "查询系统设置详情" })
  async info(@Query("id") id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.info(id);
  }

  @Post("/delete", { description: "sys:settings:edit", summary: "删除系统设置" })
  async delete(@Query("id") id: number) {
    await this.service.checkUserId(id, this.getUserId());
    const res = await super.delete(id);
    await this.auditLog({ content: "删除了系统设置" });
    return res;
  }

  @Post("/save", { description: "sys:settings:edit", summary: "保存系统设置" })
  async save(@Body(ALL) bean: SysSettingsEntity) {
    await this.service.save(bean);
    await this.auditLog({
      content: "修改了系统设置",
    });
    return this.ok({});
  }

  @Post("/get", { description: "sys:settings:view", summary: "查询系统设置" })
  async get(@Query("key") key: string) {
    const entity = await this.service.getByKey(key);
    return this.ok(entity);
  }

  // savePublicSettings
  @Post("/getEmailSettings", { description: "sys:settings:view", summary: "查询邮件服务器设置" })
  async getEmailSettings(@Body(ALL) body) {
    const conf = await getEmailSettings(this.service, this.userSettingsService);
    return this.ok(conf);
  }

  @Post("/getEmailTemplates", { description: "sys:settings:view", summary: "查询邮件模板列表" })
  async getEmailTemplates(@Body(ALL) body) {
    const conf = await getEmailSettings(this.service, this.userSettingsService);
    const templates = conf.templates || {};

    const emailTemplateProviders = await this.addonService.getDefineList("emailTemplate");

    const proviers = [];
    for (const item of emailTemplateProviders) {
      const templateConf = templates[item.name] || {};
      proviers.push({
        name: item.name,
        title: item.title,
        addonId: templateConf.addonId,
      });
    }
    return this.ok(proviers);
  }

  @Post("/saveEmailSettings", { description: "sys:settings:edit", summary: "保存邮件服务器设置" })
  async saveEmailSettings(@Body(ALL) body) {
    const conf = await getEmailSettings(this.service, this.userSettingsService);
    merge(conf, body);
    await this.service.saveSetting(conf);
    await this.auditLog({ content: "保存了邮件服务器设置" });
    return this.ok(conf);
  }

  @Post("/getSysSettings", { description: "sys:settings:view", summary: "查询系统配置" })
  async getSysSettings() {
    const publicSettings = await this.service.getPublicSettings();
    let privateSettings = await this.service.getPrivateSettings();
    privateSettings = privateSettings.removeSecret();
    return this.ok({ public: publicSettings, private: privateSettings });
  }

  // savePublicSettings
  @Post("/saveSysSettings", { description: "sys:settings:edit", summary: "保存系统设置" })
  async saveSysSettings(@Body(ALL) body: { public: SysPublicSettings; private: SysPrivateSettings }) {
    const publicSettings = await this.service.getPublicSettings();
    const privateSettings = await this.service.getPrivateSettings();
    merge(publicSettings, body.public);
    merge(privateSettings, body.private);
    await this.service.savePublicSettings(publicSettings);
    await this.service.savePrivateSettings(privateSettings);
    await this.auditLog({ content: "保存了系统设置" });
    return this.ok({});
  }

  @Post("/stopOtherUserTimer", { description: "sys:settings:edit", summary: "停止其他用户定时任务" })
  async stopOtherUserTimer(@Body(ALL) body) {
    await this.pipelineService.stopOtherUserPipeline(1);
    await this.auditLog({ content: "停止了其他用户定时任务" });
    return this.ok({});
  }

  @Post("/testProxy", { description: "sys:settings:edit", summary: "测试代理" })
  async testProxy(@Body(ALL) body) {
    const google = "https://www.google.com/";
    const baidu = "https://www.baidu.com/";
    let googleRes = false;
    try {
      await http.request({
        url: google,
        method: "GET",
        timeout: 5000,
        logRes: false,
        logParams: false,
      });
      googleRes = true;
    } catch (e) {
      googleRes = e.message;
      logger.info("test google error:", e);
    }
    let baiduRes = false;
    try {
      await http.request({
        url: baidu,
        method: "GET",
        timeout: 5000,
        logRes: false,
        logParams: false,
      });
      baiduRes = true;
    } catch (e) {
      baiduRes = e.message;
      logger.info("test baidu error:", e);
    }
    return this.ok({
      google: googleRes,
      baidu: baiduRes,
    });
  }

  @Post("/testSms", { description: "sys:settings:edit", summary: "测试短信" })
  async testSms(@Body(ALL) body) {
    await this.codeService.sendSmsCode(body.phoneCode, body.mobile);
    return this.ok({});
  }

  @Post("/getSmsTypeDefine", { description: "sys:settings:view", summary: "查询短信类型定义" })
  async getSmsTypeDefine(@Body("type") type: string) {
    const define = await SmsServiceFactory.getDefine(type);
    return this.ok(define);
  }

  @Post("/safe/get", { description: "sys:settings:view", summary: "查询安全设置" })
  async safeGet() {
    const res = await this.service.getSetting<SysSafeSetting>(SysSafeSetting);
    const clone: SysSafeSetting = cloneDeep(res);
    delete clone.hidden?.openPassword;
    return this.ok(clone);
  }

  @Post("/safe/save", { description: "sys:settings:edit", summary: "保存安全设置" })
  async safeSave(@Body(ALL) body: any) {
    if (body.hidden.openPassword) {
      body.hidden.openPassword = utils.hash.md5(body.hidden.openPassword);
    }
    const blankSetting = new SysSafeSetting();
    const setting = await this.service.getSetting<SysSafeSetting>(SysSafeSetting);
    const newSetting = merge(blankSetting, cloneDeep(setting), body);
    if (newSetting.hidden?.enabled && !newSetting.hidden?.openPassword) {
      throw new Error("首次设置需要填写解锁密码");
    }
    await this.service.saveSetting(blankSetting);
    await this.auditLog({ content: "保存了安全设置" });
    return this.ok({});
  }

  @Post("/captchaTest", { description: "sys:settings:edit", summary: "测试验证码" })
  async captchaTest(@Body(ALL) body: any, @RequestIP() remoteIp: string) {
    await this.codeService.checkCaptcha(body, { remoteIp });
    return this.ok({});
  }

  @Post("/oauth/providers", { description: "sys:settings:view", summary: "查询OAuth提供商列表" })
  async oauthProviders() {
    const list = await addonRegistry.getDefineList("oauth");
    return this.ok(list);
  }

  @Post("/clearRuntimeDeps", { description: "sys:settings:edit", summary: "清除运行时依赖" })
  async clearRuntimeDeps() {
    await this.runtimeDepsService.clearRuntimeDeps();
    await this.auditLog({ content: "清除了运行时依赖" });
    return this.ok(true);
  }
}
