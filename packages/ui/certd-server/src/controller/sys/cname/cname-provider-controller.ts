import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { CrudController } from "@certd/lib-server";
import { merge } from "lodash-es";
import { CnameProviderService } from "../../../modules/cname/service/cname-provider-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

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

  getAuditType(): string {
    return AuditType.cname.value;
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

  @Post("/add", { description: "sys:settings:edit", summary: "添加CNAME服务" })
  async add(@Body(ALL) bean: any) {
    const def: any = {
      isDefault: false,
      disabled: false,
    };
    merge(bean, def);
    bean.userId = this.getUserId();
    const res = await super.add(bean);
    await this.auditLog({ content: `添加了CNAME服务(ID:${res.data})` });
    return res;
  }

  @Post("/update", { description: "sys:settings:edit", summary: "更新CNAME服务" })
  async update(@Body(ALL) bean: any) {
    bean.userId = this.getUserId();
    const res = await super.update(bean);
    await this.auditLog({ content: `更新了CNAME服务(ID:${bean.id})` });
    return res;
  }

  @Post("/info", { description: "sys:settings:view" })
  async info(@Query("id") id: number) {
    return super.info(id);
  }

  @Post("/delete", { description: "sys:settings:edit", summary: "删除CNAME服务" })
  async delete(@Query("id") id: number) {
    const res = await super.delete(id);
    await this.auditLog({ content: `删除了CNAME服务(ID:${id})` });
    return res;
  }

  @Post("/deleteByIds", { description: "sys:settings:edit", summary: "批量删除CNAME服务" })
  async deleteByIds(@Body("ids") ids: number[]) {
    const res = await this.service.delete(ids);
    await this.auditLog({ content: `批量删除了${ids.length}条CNAME服务` });
    return this.ok(res);
  }

  @Post("/setDefault", { description: "sys:settings:edit", summary: "设置默认CNAME服务" })
  async setDefault(@Body("id") id: number) {
    await this.service.setDefault(id);
    await this.auditLog({ content: `设置了默认CNAME服务(ID:${id})` });
    return this.ok();
  }

  @Post("/setDisabled", { description: "sys:settings:edit", summary: "禁用/启用CNAME服务" })
  async setDisabled(@Body("id") id: number, @Body("disabled") disabled: boolean) {
    await this.service.setDisabled(id, disabled);
    await this.auditLog({ content: `${disabled ? "禁用" : "启用"}了CNAME服务(ID:${id})` });
    return this.ok();
  }
}
