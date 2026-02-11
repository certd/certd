import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { RoleService } from './role-service.js';

/**
 * 权限校验
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
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

  isAdmin(ctx: any) {
    const roleIds: number[] = ctx.user.roles;
    if (roleIds.includes(1)) {
      return true;
    }
  }

  //管理员有权限查看其他用户的数据
  async checkEntityUserId(ctx: any, service: any, ids: number| number[] = null, userKey = 'userId') {
    const isAdmin = await this.isAdmin(ctx);
    if (isAdmin) {
      return true;
    }
    await service.checkUserId(ids, ctx.user.id, userKey);
  }

  async checkEntityProjectId(service:any,ids:number| number[] = null,projectId = null){
    await service.checkUserId(ids, projectId , "projectId");
  }
}
