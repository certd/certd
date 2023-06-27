import { Provide, Scope, ScopeEnum } from '@midwayjs/decorator';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service';
import { UserRoleEntity } from '../entity/user-role';

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
