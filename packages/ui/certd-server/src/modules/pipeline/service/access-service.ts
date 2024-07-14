import { Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service.js';
import { AccessEntity } from '../entity/access.js';
import { accessRegistry, IAccessService } from '@certd/pipeline';

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class AccessService
  extends BaseService<AccessEntity>
  implements IAccessService
{
  @InjectEntityModel(AccessEntity)
  repository: Repository<AccessEntity>;

  getRepository() {
    return this.repository;
  }

  async getById(id: any): Promise<any> {
    const entity = await this.info(id);
    if (entity == null) {
      throw new Error(`该授权配置不存在,请确认是否已被删除:id=${id}`);
    }
    // const access = accessRegistry.get(entity.type);
    const setting = JSON.parse(entity.setting);
    return {
      id: entity.id,
      ...setting,
    };
  }

  getDefineList() {
    return accessRegistry.getDefineList();
  }

  getDefineByType(type: string) {
    return accessRegistry.getDefine(type);
  }
}
