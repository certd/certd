import { Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service.js';
import { UserSettingsEntity } from '../entity/user-settings.js';

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class UserSettingsService extends BaseService<UserSettingsEntity> {
  @InjectEntityModel(UserSettingsEntity)
  repository: Repository<UserSettingsEntity>;

  getRepository() {
    return this.repository;
  }

  async getById(id: any): Promise<UserSettingsEntity | null> {
    const entity = await this.info(id);
    if (!entity) {
      return null;
    }
    // const access = accessRegistry.get(entity.type);
    const setting = JSON.parse(entity.setting);
    return {
      id: entity.id,
      ...setting,
    };
  }

  async getByKey(
    key: string,
    userId: number
  ): Promise<UserSettingsEntity | null> {
    if (!key || !userId) {
      return null;
    }
    return await this.repository.findOne({
      where: {
        key,
        userId,
      },
    });
  }

  async getSettingByKey(key: string, userId: number): Promise<any | null> {
    const entity = await this.getByKey(key, userId);
    if (!entity) {
      return null;
    }
    return JSON.parse(entity.setting);
  }

  async save(bean: UserSettingsEntity) {
    const entity = await this.repository.findOne({
      where: {
        key: bean.key,
        userId: bean.userId,
      },
    });
    if (entity) {
      entity.setting = bean.setting;
      await this.repository.save(entity);
    } else {
      bean.title = bean.key;
      await this.repository.save(bean);
    }
  }
}
