import { Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service.js';
import { UserRoleEntity } from '../entity/user-role.js';

/**
 * 用户->角色
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class UserRoleService extends BaseService<UserRoleEntity> {
  @InjectEntityModel(UserRoleEntity)
  repository: Repository<UserRoleEntity>;

  getRepository() {
    return this.repository;
  }
}
