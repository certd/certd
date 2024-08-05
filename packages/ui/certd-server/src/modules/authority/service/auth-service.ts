import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { RoleService } from './role-service.js';
import { BaseService } from '../../../basic/base-service.js';

/**
 * 权限校验
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class AuthService {
  @Inject()
  roleService: RoleService;

  async checkPermission(ctx: any, permission: string) {
    //如果不是仅校验登录，还需要校验是否拥有权限
    const roleIds: number[] = ctx.user.roles;
    const permissions = await this.roleService.getCachedPermissionSetByRoleIds(roleIds);
    if (!permissions.has(permission)) {
      return false;
    }
    return true;
  }

  async isAdmin(ctx: any) {
    const roleIds: number[] = ctx.user.roles;
    if (roleIds.includes(1)) {
      return true;
    }
  }

  async checkEntityUserId(ctx: any, service: BaseService<any>, id: any = 0, userKey = 'userId') {
    const isAdmin = await this.isAdmin(ctx);
    if (isAdmin) {
      return true;
    }
    await service.checkUserId(id, ctx.user.id, userKey);
  }
}
