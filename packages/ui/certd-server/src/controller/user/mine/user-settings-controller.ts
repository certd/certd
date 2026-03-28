import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { Constants, CrudController } from "@certd/lib-server";
import { UserSettingsService } from "../../../modules/mine/service/user-settings-service.js";
import { UserSettingsEntity } from "../../../modules/mine/entity/user-settings.js";
import { UserGrantSetting } from "../../../modules/mine/service/models.js";
import { isPlus } from "@certd/plus-core";
import { merge } from "lodash-es";
import { ApiTags } from "@midwayjs/swagger";

/**
 */
@Provide()
@Controller('/api/user/settings')
@ApiTags(['mine'])
export class UserSettingsController extends CrudController<UserSettingsService> {
  @Inject()
  service: UserSettingsService;

  getService() {
    return this.service;
  }

  @Post('/page', { description: Constants.per.authOnly, summary: "查询用户设置分页列表" })
  async page(@Body(ALL) body) {
    body.query = body.query ?? {};
    body.query.userId = this.getUserId();
    return super.page(body);
  }

  @Post('/list', { description: Constants.per.authOnly, summary: "查询用户设置列表" })
  async list(@Body(ALL) body) {
    body.query = body.query ?? {};
    body.query.userId = this.getUserId();
    return super.list(body);
  }

  @Post('/add', { description: Constants.per.authOnly, summary: "添加用户设置" })
  async add(@Body(ALL) bean) {
    bean.userId = this.getUserId();
    return super.add(bean);
  }

  @Post('/update', { description: Constants.per.authOnly, summary: "更新用户设置" })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.getUserId());
    delete bean.userId;
    return super.update(bean);
  }
  @Post('/info', { description: Constants.per.authOnly, summary: "查询用户设置详情" })
  async info(@Query('id') id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.info(id);
  }

  @Post('/delete', { description: Constants.per.authOnly, summary: "删除用户设置" })
  async delete(@Query('id') id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.delete(id);
  }

  @Post('/save', { description: Constants.per.authOnly, summary: "保存用户设置" })
  async save(@Body(ALL) bean: UserSettingsEntity) {
    bean.userId = this.getUserId();
    await this.service.save(bean);
    return this.ok({});
  }

  @Post('/get', { description: Constants.per.authOnly, summary: "获取用户设置" })
  async get(@Query('key') key: string) {
    const {projectId,userId} = await this.getProjectUserIdRead();
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
      throw new Error('本功能需要开通Certd专业版')
    }
    const userId = this.getUserId();
    const setting = new UserGrantSetting();
    merge(setting, bean);

    await this.service.saveSetting(userId,null, setting);
    return this.ok({});
  }

}
