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
import { ApiTags } from "@midwayjs/swagger";

/**
 * Addon
 */
@Provide()
@Controller("/api/addon")
@ApiTags(['addon'])
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

  @Post("/page", { description: Constants.per.authOnly, summary: "查询Addon分页列表" })
  async page(@Body(ALL) body) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    delete body.query.userId;
    body.query.projectId = projectId;
    const buildQuery = qb => {
      qb.andWhere("user_id = :userId", { userId });
    };
    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery
    });
    return this.ok(res);
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询Addon列表" })
  async list(@Body(ALL) body) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.userId = userId;
    body.query.projectId = projectId;
    return super.list(body);
  }

  @Post("/add", { description: Constants.per.authOnly, summary: "添加Addon" })
  async add(@Body(ALL) bean) {
    const {userId,projectId} = await this.getProjectUserIdRead();
    bean.userId = userId;
    bean.projectId = projectId;
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

  @Post("/update", { description: Constants.per.authOnly, summary: "更新Addon" })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.getService(), bean.id, "write");
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
    delete bean.projectId;
    return super.update(bean);
  }

  @Post("/info", { description: Constants.per.authOnly, summary: "查询Addon详情" })
  async info(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "read");
    return super.info(id);
  }

  @Post("/delete", { description: Constants.per.authOnly, summary: "删除Addon" })
  async delete(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "write");
    return super.delete(id);
  }

  @Post("/define", { description: Constants.per.authOnly, summary: "查询Addon插件定义" })
  async define(@Query("type") type: string, @Query("addonType") addonType: string) {
    const notification = this.service.getDefineByType(type, addonType);
    return this.ok(notification);
  }

  @Post("/getTypeDict", { description: Constants.per.authOnly, summary: "查询Addon插件类型字典" })
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

  @Post("/simpleInfo", { description: Constants.per.authOnly, summary: "查询Addon插件简单信息" })
  async simpleInfo(@Query("addonType") addonType: string, @Query("id") id: number) {
    if (id === 0) {
      //获取默认
      const {projectId,userId} = await this.getProjectUserIdRead();
      const res = await this.service.getDefault(userId, addonType,projectId);
      if (!res) {
        throw new ValidateException("默认Addon配置不存在");
      }
      const simple = await this.service.getSimpleInfo(res.id);
      return this.ok(simple);
    }
    await this.checkOwner(this.getService(), id, "read",true);
    const res = await this.service.getSimpleInfo(id);
    return this.ok(res);
  }

  @Post("/getDefaultId", { description: Constants.per.authOnly, summary: "查询Addon插件默认配置ID" })
  async getDefaultId(@Query("addonType") addonType: string) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    const res = await this.service.getDefault(userId, addonType,projectId);
    return this.ok(res?.id);
  }

  @Post("/setDefault", { description: Constants.per.authOnly, summary: "设置Addon插件默认配置" })
  async setDefault(@Query("addonType") addonType: string, @Query("id") id: number) {
    const {projectId,userId} = await this.checkOwner(this.getService(), id, "write",true);
    const res = await this.service.setDefault(id, userId, addonType,projectId);
    return this.ok(res);
  }


  @Post("/options", { description: Constants.per.authOnly, summary: "查询Addon插件配置字典" })
  async options(@Query("addonType") addonType: string) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    const res = await this.service.list({
      query: {
        userId,
        addonType,
        projectId
      }
    });
    for (const item of res) {
      delete item.setting;
    }
    return this.ok(res);
  }


  @Post("/handle", { description: Constants.per.authOnly, summary: "Addon插件处理请求" })
  async handle(@Body(ALL) body: AddonRequestHandleReq) {
    let inputAddon = body.input.addon;
    if (body.input.id > 0) {
      await this.checkOwner(this.getService(), body.input.id, "write",true);
      const oldEntity = await this.service.info(body.input.id);
      if (oldEntity) {
        inputAddon = JSON.parse(oldEntity.setting);
      }
    }
    const {projectId,userId} = await this.getProjectUserIdRead();
    const serviceGetter = this.taskServiceBuilder.create({ userId,projectId });

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
