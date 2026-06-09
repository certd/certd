import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { In, Repository } from "typeorm";
import { BaseService } from "@certd/lib-server";
import { RoleEntity } from "../entity/role.js";
import { UserRoleService } from "./user-role-service.js";
import { RolePermissionEntity } from "../entity/role-permission.js";
import { PermissionService } from "./permission-service.js";
import * as _ from "lodash-es";
import { RolePermissionService } from "./role-permission-service.js";
import { LRUCache } from "lru-cache";

const permissionCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 10,
});

/**
 * 角色
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class RoleService extends BaseService<RoleEntity> {
  @InjectEntityModel(RoleEntity)
  repository: Repository<RoleEntity>;
  @Inject()
  userRoleService: UserRoleService;
  @Inject()
  permissionService: PermissionService;
  @Inject()
  rolePermissionService: RolePermissionService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async getRoleIdsByUserId(id: any) {
    const userRoles = await this.userRoleService.find({
      where: { userId: id },
    });
    return userRoles.map(item => item.roleId);
  }
  async getByUserIds(ids: any) {
    return await this.userRoleService.find({
      where: {
        userId: In<number>(ids) as any,
      },
    });
  }

  async getPermissionByRoleIds(roleIds: any) {
    if (!roleIds || roleIds.length === 0) {
      return [];
    }
    return await this.permissionService.repository.createQueryBuilder("permission").innerJoinAndSelect(RolePermissionEntity, "rp", "rp.permissionId = permission.id and rp.roleId in (:...roleIds)", { roleIds }).getMany();
  }

  async addRoles(userId: number, roles) {
    if (roles == null || roles.length === 0) {
      return;
    }
    for (const roleId of roles) {
      await this.userRoleService.add({
        userId,
        roleId,
      });
    }
  }

  async updateRoles(userId, roles) {
    if (roles == null) {
      return;
    }
    const oldRoleIds = await this.getRoleIdsByUserId(userId);
    if (_.xor(roles, oldRoleIds).length === 0) {
      //如果两个数组相等，则不修改
      return;
    }
    //先删除所有
    await this.userRoleService.deleteWhere({ userId });
    //再添加
    await this.addRoles(userId, roles);

    permissionCache.clear();
  }

  async getPermissionTreeByRoleId(id: any) {
    const list = await this.getPermissionByRoleIds([id]);
    return this.permissionService.buildTree(list);
  }

  async getPermissionIdsByRoleId(id: any) {
    const list = await this.getPermissionByRoleIds([id]);
    return list.map(item => item.id);
  }

  async authz(roleId: any, permissionIds: any) {
    await this.rolePermissionService.deleteWhere({ roleId });
    for (const permissionId of permissionIds) {
      await this.rolePermissionService.add({
        roleId,
        permissionId,
      });
    }
    permissionCache.clear();
  }

  async getPermissionSetByRoleIds(roleIds: number[]): Promise<Set<string>> {
    const list = await this.getPermissionByRoleIds(roleIds);

    const permissionSet = new Set<string>();
    for (const entity of list) {
      permissionSet.add(entity.permission);
    }
    return permissionSet;
  }

  async getCachedPermissionSetByRoleIds(roleIds: number[]): Promise<Set<string>> {
    const roleIdsKey = roleIds.join(",");
    let permissionSet = permissionCache.get(roleIdsKey);
    if (permissionSet) {
      return permissionSet;
    }
    permissionSet = await this.getPermissionSetByRoleIds(roleIds);
    permissionCache.set(roleIdsKey, permissionSet);
    return permissionSet;
  }

  //@ts-ignore
  async delete(id: any) {
    const idArr = this.resolveIdArr(id);
    //@ts-ignore
    const urs = await this.userRoleService.find({ where: { roleId: In(idArr) } });
    if (urs.length > 0) {
      throw new Error("该角色已被用户使用，无法删除");
    }
    await this.deleteWhere({ id: In(idArr) });
  }
}
