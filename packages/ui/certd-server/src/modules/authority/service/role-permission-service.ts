import { Provide, Scope, ScopeEnum } from '@midwayjs/decorator';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service';
import { RolePermissionEntity } from '../entity/role-permission';

/**
 * 角色->权限
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class RolePermissionService extends BaseService<RolePermissionEntity> {
  @InjectEntityModel(RolePermissionEntity)
  repository: Repository<RolePermissionEntity>;

  getRepository() {
    return this.repository;
  }
}
