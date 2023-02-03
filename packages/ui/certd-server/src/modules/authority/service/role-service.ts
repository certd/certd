import { Inject, Provide } from '@midwayjs/decorator';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service';
import { RoleEntity } from '../entity/role';
import { UserRoleService } from './user-role-service';
import { RolePermissionEntity } from '../entity/role-permission';
import { PermissionService } from './permission-service';
import * as _ from 'lodash';
import { RolePermissionService } from './role-permission-service';
/**
 * 角色
 */
@Provide()
export class RoleService extends BaseService<RoleEntity> {
  @InjectEntityModel(RoleEntity)
  repository: Repository<RoleEntity>;
  @Inject()
  userRoleService: UserRoleService;
  @Inject()
  permissionService: PermissionService;
  @Inject()
  rolePermissionService: RolePermissionService;

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
        userId: In(ids),
      },
    });
  }

  async getPermissionByRoleIds(roleIds: any) {
    return await this.permissionService.repository
      .createQueryBuilder('permission')
      .innerJoinAndSelect(
        RolePermissionEntity,
        'rp',
        'rp.permissionId = permission.id and rp.roleId in (:...roleIds)',
        { roleIds }
      )
      .getMany();
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
    await this.userRoleService.delete({ userId });
    //再添加
    await this.addRoles(userId, roles);
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
    await this.rolePermissionService.delete({ roleId });
    for (const permissionId of permissionIds) {
      await this.rolePermissionService.add({
        roleId,
        permissionId,
      });
    }
  }
}
