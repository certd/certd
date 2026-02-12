import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import {
  AddonDefine,
  AddonRequestHandleReq,
  AddonService,
  Constants,
  CrudController,
  newAddon,
  ValidateException
} from "@certd/lib-server";
import { AuthService } from "../../../modules/sys/authority/service/auth-service.js";
import { checkPlus } from "@certd/plus-core";
import { http, logger, utils } from "@certd/basic";
import { TaskServiceBuilder } from "../../../modules/pipeline/service/getter/task-service-getter.js";

/**
 * Addon
 */
@Provide()
@Controller("/api/addon")
export class AddonController extends CrudController<AddonService> {
  @Inject()
  service: AddonService;
  @Inject()
  authService: AuthService;
  @Inject()
  taskServiceBuilder:TaskServiceBuilder

  getService(): AddonService {
    return this.service;
  }

  @Post("/page", { summary: Constants.per.authOnly })
  async page(@Body(ALL) body) {
    body.query = body.query ?? {};
    delete body.query.userId;
    const buildQuery = qb => {
      qb.andWhere("user_id = :userId", { userId: this.getUserId() });
    };
    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery
    });
    return this.ok(res);
  }

  @Post("/list", { summary: Constants.per.authOnly })
  async list(@Body(ALL) body) {
    body.query = body.query ?? {};
    body.query.userId = this.getUserId();
    return super.list(body);
  }

  @Post("/add", { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean) {
    bean.userId = this.getUserId();
    const type = bean.type;
    const addonType = bean.addonType;
    if (!type || !addonType) {
      throw new ValidateException("请选择Addon类型");
    }
    const define: AddonDefine = this.service.getDefineByType(type, addonType);
    if (!define) {
      throw new ValidateException("Addon类型不存在");
    }
    if (define.needPlus) {
      checkPlus();
    }
    return super.add(bean);
  }

  @Post("/update", { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.getUserId());
    const old = await this.service.info(bean.id);
    if (!old) {
      throw new ValidateException("Addon配置不存在");
    }
    if (old.type !== bean.type) {
      const addonType = old.type;
      const type = bean.type;
      const define: AddonDefine = this.service.getDefineByType(type, addonType);
      if (!define) {
        throw new ValidateException("Addon类型不存在");
      }
      if (define.needPlus) {
        checkPlus();
      }
    }
    delete bean.userId;
    return super.update(bean);
  }

  @Post("/info", { summary: Constants.per.authOnly })
  async info(@Query("id") id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.info(id);
  }

  @Post("/delete", { summary: Constants.per.authOnly })
  async delete(@Query("id") id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.delete(id);
  }

  @Post("/define", { summary: Constants.per.authOnly })
  async define(@Query("type") type: string, @Query("addonType") addonType: string) {
    const notification = this.service.getDefineByType(type, addonType);
    return this.ok(notification);
  }

  @Post("/getTypeDict", { summary: Constants.per.authOnly })
  async getTypeDict(@Query("addonType") addonType: string) {
    const list: any = this.service.getDefineList(addonType);
    let dict = [];
    for (const item of list) {
      dict.push({
        value: item.name,
        label: item.title,
        needPlus: item.needPlus ?? false,
        icon: item.icon
      });
    }
    dict = dict.sort(a => {
      return a.needPlus ? 0 : -1;
    });
    return this.ok(dict);
  }

  @Post("/simpleInfo", { summary: Constants.per.authOnly })
  async simpleInfo(@Query("addonType") addonType: string, @Query("id") id: number) {
    if (id === 0) {
      //获取默认
      const res = await this.service.getDefault(this.getUserId(), addonType);
      if (!res) {
        throw new ValidateException("默认Addon配置不存在");
      }
      const simple = await this.service.getSimpleInfo(res.id);
      return this.ok(simple);
    }
    await this.authService.checkUserIdButAllowAdmin(this.ctx, this.service, id);
    const res = await this.service.getSimpleInfo(id);
    return this.ok(res);
  }

  @Post("/getDefaultId", { summary: Constants.per.authOnly })
  async getDefaultId(@Query("addonType") addonType: string) {
    const res = await this.service.getDefault(this.getUserId(), addonType);
    return this.ok(res?.id);
  }

  @Post("/setDefault", { summary: Constants.per.authOnly })
  async setDefault(@Query("addonType") addonType: string, @Query("id") id: number) {
    await this.service.checkUserId(id, this.getUserId());
    const res = await this.service.setDefault(id, this.getUserId(), addonType);
    return this.ok(res);
  }


  @Post("/options", { summary: Constants.per.authOnly })
  async options(@Query("addonType") addonType: string) {
    const res = await this.service.list({
      query: {
        userId: this.getUserId(),
        addonType
      }
    });
    for (const item of res) {
      delete item.setting;
    }
    return this.ok(res);
  }


  @Post("/handle", { summary: Constants.per.authOnly })
  async handle(@Body(ALL) body: AddonRequestHandleReq) {
    const userId = this.getUserId();
    let inputAddon = body.input.addon;
    if (body.input.id > 0) {
      const oldEntity = await this.service.info(body.input.id);
      if (oldEntity) {
        if (oldEntity.userId !== userId) {
          throw new Error("addon not found");
        }
        // const param: any = {
        //   type: body.typeName,
        //   setting: JSON.stringify(body.input.access),
        // };
        inputAddon = JSON.parse(oldEntity.setting);
      }
    }
    const serviceGetter = this.taskServiceBuilder.create({ userId });

    const ctx = {
      http: http,
      logger: logger,
      utils: utils,
      serviceGetter
    };
    const addon = await newAddon(body.addonType, body.typeName, inputAddon, ctx);
    const res = await addon.onRequest(body);
    return this.ok(res);
  }
}
