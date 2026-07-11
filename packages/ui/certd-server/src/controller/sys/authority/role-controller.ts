import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { CrudController } from "@certd/lib-server";
import { RoleService } from "../../../modules/sys/authority/service/role-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

/**
 * 系统用户
 */
@Provide()
@Controller("/api/sys/authority/role")
export class RoleController extends CrudController<RoleService> {
  @Inject()
  service: RoleService;

  getService() {
    return this.service;
  }

  getAuditType(): string {
    return AuditType.role;
  }

  @Post("/page", { description: "sys:auth:role:view" })
  async page(
    @Body(ALL)
    body
  ) {
    return await super.page(body);
  }

  @Post("/list", { description: "sys:auth:role:view" })
  async list() {
    const ret = await this.service.find({});
    return this.ok(ret);
  }

  @Post("/add", { description: "sys:auth:role:add", summary: "新增角色" })
  async add(
    @Body(ALL)
    bean
  ) {
    const res = await super.add(bean);
    await this.auditLog({
      content: `新增了角色「${bean.name}」(ID:${res.data})`,
    });
    return res;
  }

  @Post("/update", { description: "sys:auth:role:edit", summary: "修改角色" })
  async update(
    @Body(ALL)
    bean
  ) {
    const res = await super.update(bean);
    await this.auditLog({
      content: `修改了角色「${bean.name}」(ID:${bean.id})`,
    });
    return res;
  }
  @Post("/delete", { description: "sys:auth:role:remove", summary: "删除角色" })
  async delete(
    @Query("id")
    id: number
  ) {
    if (id === 1) {
      throw new Error("不能删除默认的管理员角色");
    }
    const res = await super.delete(id);
    await this.auditLog({
      content: `删除了角色(ID:${id})`,
    });
    return res;
  }

  @Post("/getPermissionTree", { description: "sys:auth:role:view" })
  async getPermissionTree(
    @Query("id")
    id: number
  ) {
    const ret = await this.service.getPermissionTreeByRoleId(id);
    return this.ok(ret);
  }

  @Post("/getPermissionIds", { description: "sys:auth:role:view" })
  async getPermissionIds(
    @Query("id")
    id: number
  ) {
    const ret = await this.service.getPermissionIdsByRoleId(id);
    return this.ok(ret);
  }

  /**
   * 给角色授予权限
   * @param roleId
   * @param permissionIds
   */
  @Post("/authz", { description: "sys:auth:role:edit", summary: "角色授权" })
  async authz(@Body("roleId") roleId, @Body("permissionIds") permissionIds) {
    await this.service.authz(roleId, permissionIds);
    await this.auditLog({ content: `为角色(ID:${roleId})进行了授权` });
    return this.ok(null);
  }
}
