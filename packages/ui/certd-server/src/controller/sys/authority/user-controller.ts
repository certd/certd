import { Provide, Controller, Post, Inject, Body, Query, ALL } from "@midwayjs/core";
import { UserService } from "../../../modules/sys/authority/service/user-service.js";
import { CrudController } from "@certd/lib-server";
import { RoleService } from "../../../modules/sys/authority/service/role-service.js";
import { PermissionService } from "../../../modules/sys/authority/service/permission-service.js";
import { Constants } from "@certd/lib-server";
import { In } from "typeorm";
import { LoginService } from "../../../modules/login/service/login-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

/**
 * 系统用户
 */
@Provide()
@Controller("/api/sys/authority/user")
export class UserController extends CrudController<UserService> {
  @Inject()
  service: UserService;

  @Inject()
  roleService: RoleService;
  @Inject()
  permissionService: PermissionService;

  @Inject()
  loginService: LoginService;

  getAuditType(): string {
    return AuditType.user;
  }

  getService() {
    return this.service;
  }

  @Post("/getSimpleUserByIds", { description: "sys:auth:user:view" })
  async getSimpleUserByIds(@Body("ids") ids: number[]) {
    const users = await this.service.find({
      select: {
        id: true,
        username: true,
        nickName: true,
        mobile: true,
        phoneCode: true,
      },
      where: {
        id: In(ids),
      },
    });

    return this.ok(users);
  }

  @Post("/getSimpleUsers", { description: "sys:auth:user:view" })
  async getSimpleUsers() {
    const users = await this.service.find({
      select: {
        id: true,
        username: true,
        nickName: true,
        mobile: true,
        phoneCode: true,
      },
    });
    return this.ok(users);
  }

  @Post("/page", { description: "sys:auth:user:view" })
  async page(
    @Body(ALL)
    body
  ) {
    const ret = await super.page(body);

    const users = ret.data.records;

    //获取roles
    const userIds = users.map(item => item.id);
    const userRoles = await this.roleService.getByUserIds(userIds);
    const userRolesMap = new Map();
    for (const ur of userRoles) {
      let roles = userRolesMap.get(ur.userId);
      if (roles == null) {
        roles = [];
        userRolesMap.set(ur.userId, roles);
      }
      roles.push(ur.roleId);
    }

    for (const record of users) {
      //withRoles
      record.roles = userRolesMap.get(record.id);
      //删除密码字段
      delete record.password;
    }

    return ret;
  }

  @Post("/add", { description: "sys:auth:user:add", summary: "新增用户" })
  async add(
    @Body(ALL)
    bean
  ) {
    const res = await super.add(bean);
    await this.auditLog({
      content: `新增了用户「${bean.username}」(ID:${res.data})`,
    });
    return res;
  }

  @Post("/update", { description: "sys:auth:user:edit", summary: "修改用户" })
  async update(
    @Body(ALL)
    bean
  ) {
    const res = await super.update(bean);
    await this.auditLog({
      content: `修改了用户「${bean.username}」(ID:${bean.id})`,
    });
    return res;
  }

  @Post("/delete", { description: "sys:auth:user:remove", summary: "删除用户" })
  async delete(
    @Query("id")
    id: number
  ) {
    if (id === 1) {
      throw new Error("不能删除默认的管理员角色");
    }
    if (id === 3) {
      throw new Error("不能删除默认的普通用户角色");
    }
    const res = await super.delete(id);
    await this.auditLog({
      content: `删除了用户(ID:${id})`,
    });
    return res;
  }

  /**
   * 解除登录锁定
   */
  @Post("/unlockBlock", { description: "sys:auth:user:edit", summary: "解锁登录锁定" })
  public async unlockBlock(@Body("id") id: number) {
    const info = await this.service.info(id, ["password"]);
    this.loginService.clearCacheOnSuccess(info.username);
    if (info.mobile) {
      this.loginService.clearCacheOnSuccess(info.mobile);
    }
    await this.auditLog({ content: `解锁了用户登录锁定(ID:${id})` });
    return this.ok(info);
  }

  /**
   * 当前登录用户的个人信息
   */
  @Post("/mine", { description: Constants.per.authOnly })
  public async mine() {
    const id = this.getUserId();
    const info = await this.service.info(id, ["password"]);
    return this.ok(info);
  }

  /**
   * 当前登录用户的权限列表
   */
  @Post("/permissions", { description: Constants.per.authOnly })
  public async permissions() {
    const id = this.getUserId();
    const permissions = await this.service.getUserPermissions(id);
    return this.ok(permissions);
  }

  /**
   * 当前登录用户的权限树形列表
   */
  @Post("/permissionTree", { description: Constants.per.authOnly })
  public async permissionTree() {
    const id = this.getUserId();
    const permissions = await this.service.getUserPermissions(id);
    const tree = this.permissionService.buildTree(permissions);
    return this.ok(tree);
  }
}
