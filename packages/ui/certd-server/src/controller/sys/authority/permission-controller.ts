import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { CrudController } from "@certd/lib-server";
import { PermissionService } from "../../../modules/sys/authority/service/permission-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

/**
 * 权限资源
 */
@Provide()
@Controller("/api/sys/authority/permission")
export class PermissionController extends CrudController<PermissionService> {
  @Inject()
  service: PermissionService;

  getService() {
    return this.service;
  }
  getAuditType(): string {
    return AuditType.permission.value;
  }

  @Post("/page", { description: "sys:auth:per:view", summary: "查询权限分页列表" })
  async page(
    @Body(ALL)
    body
  ) {
    return await super.page(body);
  }

  @Post("/add", { description: "sys:auth:per:add", summary: "添加权限" })
  async add(
    @Body(ALL)
    bean
  ) {
    const res = await super.add(bean);
    await this.auditLog({
      content: `新增了权限「${bean.name}」(ID:${res.data})`,
    });
    return res;
  }

  @Post("/update", { description: "sys:auth:per:edit", summary: "更新权限" })
  async update(
    @Body(ALL)
    bean
  ) {
    const res = await super.update(bean);
    await this.auditLog({
      content: `修改了权限「${bean.name}」(ID:${bean.id})`,
    });
    return res;
  }
  @Post("/delete", { description: "sys:auth:per:remove", summary: "删除权限" })
  async delete(
    @Query("id")
    id: number
  ) {
    const res = await super.delete(id);
    await this.auditLog({
      content: `删除了权限(ID:${id})`,
    });
    return res;
  }

  @Post("/tree", { description: "sys:auth:per:view", summary: "查询权限树" })
  async tree() {
    const tree = await this.service.tree({});
    return this.ok(tree);
  }
}
