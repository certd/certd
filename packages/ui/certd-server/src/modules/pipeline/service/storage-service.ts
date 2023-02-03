import { Provide, Scope, ScopeEnum } from "@midwayjs/decorator";
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service';
import { StorageEntity } from '../entity/storage';

/**
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class StorageService extends BaseService<StorageEntity> {
  @InjectEntityModel(StorageEntity)
  repository: Repository<StorageEntity>;

  getRepository() {
    return this.repository;
  }

  async get(where: {
    scope: any;
    namespace: any;
    userId: number;
    key: string;
  }) {
    if (where.userId == null) {
      throw new Error('userId 不能为空');
    }
    return await this.repository.findOne({
      where,
    });
  }

  async set(entity: {
    id?: any;
    scope: any;
    namespace: any;
    userId: number;
    value: string;
    key: string;
  }) {
    entity.id = null;
    const query = { ...entity };
    delete query.value;
    const ret = await this.get(query);
    if (ret != null) {
      entity.id = ret.id;
      if (ret.userId !== entity.userId) {
        throw new Error('您没有权限修改此数据');
      }
      await this.repository.save(entity);
    } else {
      await this.repository.insert(entity);
    }
    return;
  }
}
