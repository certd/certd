import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { AddonRequestHandleReq, AddonService } from "@certd/lib-server";
import { AddonController } from "../../user/addon/addon-controller.js";

@Provide()
@Controller("/api/sys/addon")
export class SysAddonController extends AddonController {
  @Inject()
  service2: AddonService;

  getService(): AddonService {
    return this.service2;
  }

  async getProjectUserId(permission: string) {
    return {
      projectId: null,
      userId: 0, //0为系统级别
    };
  }
  getUserId() {
    // checkComm();
    return 0;
  }

  @Post("/page", { description: "sys:settings:view" })
  async page(@Body(ALL) body: any) {
    return await super.page(body);
  }

  @Post("/list", { description: "sys:settings:view" })
  async list(@Body(ALL) body: any) {
    return await super.list(body);
  }

  @Post("/add", { description: "sys:settings:edit" })
  async add(@Body(ALL) bean: any) {
    return await super.add(bean);
  }

  @Post("/update", { description: "sys:settings:edit" })
  async update(@Body(ALL) bean: any) {
    return await super.update(bean);
  }
  @Post("/info", { description: "sys:settings:view" })
  async info(@Query("id") id: number) {
    return await super.info(id);
  }

  @Post("/delete", { description: "sys:settings:edit" })
  async delete(@Query("id") id: number) {
    return await super.delete(id);
  }
  @Post("/define", { description: "sys:settings:edit" })
  async define(@Query("type") type: string, @Query("addonType") addonType: string) {
    return await super.define(type, addonType);
  }

  @Post("/getTypeDict", { description: "sys:settings:view" })
  async getTypeDict(@Query("addonType") addonType: string) {
    return await super.getTypeDict(addonType);
  }

  @Post("/simpleInfo", { description: "sys:settings:view" })
  async simpleInfo(@Query("addonType") addonType: string, @Query("id") id: number) {
    return await super.simpleInfo(addonType, id);
  }

  @Post("/getDefaultId", { description: "sys:settings:view" })
  async getDefaultId(@Query("addonType") addonType: string) {
    return await super.getDefaultId(addonType);
  }

  @Post("/setDefault", { description: "sys:settings:edit" })
  async setDefault(@Query("addonType") addonType: string, @Query("id") id: number) {
    return await super.setDefault(addonType, id);
  }

  @Post("/options", { description: "sys:settings:view" })
  async options(@Query("addonType") addonType: string) {
    return await super.options(addonType);
  }

  @Post("/handle", { description: "sys:settings:edit" })
  async handle(@Body(ALL) body: AddonRequestHandleReq) {
    return await super.handle(body);
  }
}
