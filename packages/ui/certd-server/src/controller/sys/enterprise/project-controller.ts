import { CrudController, SysSettingsService } from "@certd/lib-server";
import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { ProjectService } from "../../../modules/sys/enterprise/service/project-service.js";
import { ProjectEntity } from "../../../modules/sys/enterprise/entity/project.js";
import { merge } from "lodash-es";
import { AuditType, AuditAction } from "../../modules/sys/enterprise/service/audit-constants.js";

/**
 */
@Provide()
@Controller("/api/sys/enterprise/project")
export class SysProjectController extends CrudController<ProjectEntity> {
  @Inject()
  service: ProjectService;

  @Inject()
  sysSettingsService: SysSettingsService;

  getService<T>() {
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
    const res = await super.add({
      ...bean,
      userId: -1, //企业用户id固定为-1
      adminId: bean.userId,
    });
    await this.auditLog({
      type: AuditType.project,
      action: AuditAction.add,
      content: `新增了项目「${bean.name}」(ID:${res.data})`,
    });
    return res;
  }

  @Post("/update", { description: "sys:settings:edit" })
  async update(@Body(ALL) bean: any) {
    bean.userId = this.getUserId();
    const res = await super.update(bean);
    await this.auditLog({
      type: AuditType.project,
      action: AuditAction.update,
      content: `修改了项目「${bean.name}」(ID:${bean.id})`,
    });
    return res;
  }

  @Post("/info", { description: "sys:settings:view" })
  async info(@Query("id") id: number) {
    return super.info(id);
  }

  @Post("/delete", { description: "sys:settings:edit" })
  async delete(@Query("id") id: number) {
    const res = await super.delete(id);
    await this.auditLog({
      type: AuditType.project,
      action: AuditAction.delete,
      content: `删除了项目(ID:${id})`,
    });
    return res;
  }

  @Post("/deleteByIds", { description: "sys:settings:edit" })
  async deleteByIds(@Body("ids") ids: number[]) {
    const res = await this.service.delete(ids);
    return this.ok(res);
  }
  @Post("/setDisabled", { description: "sys:settings:edit" })
  async setDisabled(@Body("id") id: number, @Body("disabled") disabled: boolean) {
    await this.service.setDisabled(id, disabled);
    const project = await this.service.info(id);
    const actionText = disabled ? "禁用了" : "启用了";
    await this.auditLog({
      type: AuditType.project,
      action: AuditAction.disable,
      content: `${actionText}项目「${project.name}」(ID:${id})`,
    });
    return this.ok();
  }
}
