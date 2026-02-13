import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { Constants, CrudController } from "@certd/lib-server";
import { UserSettingsService } from "../../../modules/mine/service/user-settings-service.js";
import { UserSettingsEntity } from "../../../modules/mine/entity/user-settings.js";
import { UserGrantSetting } from "../../../modules/mine/service/models.js";
import { isPlus } from "@certd/plus-core";
import { merge } from "lodash-es";

/**
 */
@Provide()
@Controller('/api/user/settings')
export class UserSettingsController extends CrudController<UserSettingsService> {
  @Inject()
  service: UserSettingsService;

  getService() {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body) {
    body.query = body.query ?? {};
    body.query.userId = this.getUserId();
    return super.page(body);
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body) {
    body.query = body.query ?? {};
    body.query.userId = this.getUserId();
    return super.list(body);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean) {
    bean.userId = this.getUserId();
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.getUserId());
    delete bean.userId;
    return super.update(bean);
  }
  @Post('/info', { summary: Constants.per.authOnly })
  async info(@Query('id') id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.info(id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.delete(id);
  }

  @Post('/save', { summary: Constants.per.authOnly })
  async save(@Body(ALL) bean: UserSettingsEntity) {
    bean.userId = this.getUserId();
    await this.service.save(bean);
    return this.ok({});
  }

  @Post('/get', { summary: Constants.per.authOnly })
  async get(@Query('key') key: string) {
    const entity = await this.service.getByKey(key, this.getUserId());
    return this.ok(entity);
  }
  @Post("/grant/get", { summary: Constants.per.authOnly })
  async grantSettingsGet() {
    const userId = this.getUserId();
    const setting = await this.service.getSetting<UserGrantSetting>(userId, UserGrantSetting);
    return this.ok(setting);
  }

  @Post("/grant/save", { summary: Constants.per.authOnly })
  async grantSettingsSave(@Body(ALL) bean: UserGrantSetting) {
    if (!isPlus()) {
      throw new Error('本功能需要开通专业版')
    }
    const userId = this.getUserId();
    const setting = new UserGrantSetting();
    merge(setting, bean);

    await this.service.saveSetting(userId, setting);
    return this.ok({});
  }

}
