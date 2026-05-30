import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { CrudController } from "@certd/lib-server";
import { merge } from "lodash-es";
import { CnameProviderService } from "../../../modules/cname/service/cname-provider-service.js";

/**
 * 授权
 */
@Provide()
@Controller("/api/sys/cname/provider")
export class CnameRecordController extends CrudController<CnameProviderService> {
  @Inject()
  service: CnameProviderService;

  getService(): CnameProviderService {
    return this.service;
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

  @Post("/add", { description: "sys:settings:edit" })
  async add(@Body(ALL) bean: any) {
    const def: any = {
      isDefault: false,
      disabled: false,
    };
    merge(bean, def);
    bean.userId = this.getUserId();
    return super.add(bean);
  }

  @Post("/update", { description: "sys:settings:edit" })
  async update(@Body(ALL) bean: any) {
    bean.userId = this.getUserId();
    return super.update(bean);
  }

  @Post("/info", { description: "sys:settings:view" })
  async info(@Query("id") id: number) {
    return super.info(id);
  }

  @Post("/delete", { description: "sys:settings:edit" })
  async delete(@Query("id") id: number) {
    return super.delete(id);
  }

  @Post("/deleteByIds", { description: "sys:settings:edit" })
  async deleteByIds(@Body("ids") ids: number[]) {
    const res = await this.service.delete(ids);
    return this.ok(res);
  }

  @Post("/setDefault", { description: "sys:settings:edit" })
  async setDefault(@Body("id") id: number) {
    await this.service.setDefault(id);
    return this.ok();
  }

  @Post("/setDisabled", { description: "sys:settings:edit" })
  async setDisabled(@Body("id") id: number, @Body("disabled") disabled: boolean) {
    await this.service.setDisabled(id, disabled);
    return this.ok();
  }
}
