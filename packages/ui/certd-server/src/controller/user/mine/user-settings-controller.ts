import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { Constants, CrudController } from "@certd/lib-server";
import { UserSettingsService } from "../../../modules/mine/service/user-settings-service.js";
import { UserSettingsEntity } from "../../../modules/mine/entity/user-settings.js";
import { UserGrantSetting, UserPreferencesSetting } from "../../../modules/mine/service/models.js";
import { isPlus } from "@certd/plus-core";
import { merge } from "lodash-es";
import { ApiTags } from "@midwayjs/swagger";
import { parseUserPreferencesPayload } from "./user-preferences.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

/**
 */
@Provide()
@Controller("/api/user/settings")
@ApiTags(["mine"])
export class UserSettingsController extends CrudController<UserSettingsService> {
  @Inject()
  service: UserSettingsService;

  getService() {
    return this.service;
  }

  getAuditType(): string {
    return AuditType.mine.value;
  }

  @Post("/page", { description: Constants.per.authOnly, summary: "查询用户设置分页列表" })
  async page(@Body(ALL) body) {
    body.query = body.query ?? {};
    body.query.userId = this.getUserId();
    return super.page(body);
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询用户设置列表" })
  async list(@Body(ALL) body) {
    body.query = body.query ?? {};
    body.query.userId = this.getUserId();
    return super.list(body);
  }

  @Post("/add", { description: Constants.per.authOnly, summary: "添加用户设置" })
  async add(@Body(ALL) bean) {
    bean.userId = this.getUserId();
    return super.add(bean);
  }

  @Post("/update", { description: Constants.per.authOnly, summary: "更新用户设置" })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.getUserId());
    delete bean.userId;
    return super.update(bean);
  }
  @Post("/info", { description: Constants.per.authOnly, summary: "查询用户设置详情" })
  async info(@Query("id") id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.info(id);
  }

  @Post("/delete", { description: Constants.per.authOnly, summary: "删除用户设置" })
  async delete(@Query("id") id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.delete(id);
  }

  @Post("/save", { description: Constants.per.authOnly, summary: "保存用户设置" })
  async save(@Body(ALL) bean: UserSettingsEntity) {
    bean.userId = this.getUserId();
    await this.service.save(bean);
    this.auditLog({ content: "保存了用户设置" });
    return this.ok({});
  }

  @Post("/get", { description: Constants.per.authOnly, summary: "获取用户设置" })
  async get(@Query("key") key: string) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    const entity = await this.service.getByKey(key, userId, projectId);
    return this.ok(entity);
  }
  @Post("/grant/get", { description: Constants.per.authOnly, summary: "获取授权设置" })
  async grantSettingsGet() {
    const userId = this.getUserId();
    const setting = await this.service.getSetting<UserGrantSetting>(userId, null, UserGrantSetting);
    return this.ok(setting);
  }

  @Post("/grant/save", { description: Constants.per.authOnly, summary: "保存授权设置" })
  async grantSettingsSave(@Body(ALL) bean: UserGrantSetting) {
    if (!isPlus()) {
      throw new Error("本功能需要开通Certd专业版");
    }
    const userId = this.getUserId();
    const setting = new UserGrantSetting();
    merge(setting, bean);

    await this.service.saveSetting(userId, null, setting);
    this.auditLog({ content: `保存了授权设置 「${setting.allowAdminViewCerts ? "允许管理员查看证书" : "禁止管理员查看证书"}」` });
    return this.ok({});
  }

  @Post("/preferences/get", { description: Constants.per.authOnly, summary: "获取用户偏好设置" })
  async preferencesGet() {
    const userId = this.getUserId();
    const entity = await this.service.getByKey(UserPreferencesSetting.__key__, userId, null);
    if (!entity?.setting) {
      return this.ok(null);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(entity.setting);
    } catch {
      return this.ok(null);
    }
    return this.ok(parseUserPreferencesPayload(parsed));
  }

  @Post("/preferences/save", { description: Constants.per.authOnly, summary: "保存用户偏好设置" })
  async preferencesSave(@Body(ALL) bean: any) {
    const userId = this.getUserId();
    const preferences = parseUserPreferencesPayload(bean);
    if (!preferences) {
      throw new Error("偏好设置内容无效");
    }
    // 整份替换，避免 saveSetting 深合并留下已恢复为默认值的旧字段
    const entity = new UserSettingsEntity();
    entity.key = UserPreferencesSetting.__key__;
    entity.title = UserPreferencesSetting.__title__;
    entity.userId = userId;
    entity.setting = JSON.stringify({ preferences });
    await this.service.save(entity);
    this.auditLog({ content: "保存了用户偏好设置" });
    return this.ok({});
  }
}
