import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service.js';
import { SysSettingsEntity } from '../entity/sys-settings.js';
import { CacheManager } from '@midwayjs/cache';
import { BaseSettings, SysPublicSettings } from './models.js';
import * as _ from 'lodash-es';

export type SysPrivateSettings = NonNullable<unknown>;

/**
 * 设置
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class SysSettingsService extends BaseService<SysSettingsEntity> {
  @InjectEntityModel(SysSettingsEntity)
  repository: Repository<SysSettingsEntity>;

  @Inject()
  cache: CacheManager; // 依赖注入CacheManager

  getRepository() {
    return this.repository;
  }

  async getById(id: any): Promise<SysSettingsEntity | null> {
    const entity = await this.info(id);
    if (!entity) {
      return null;
    }
    const setting = JSON.parse(entity.setting);
    return {
      id: entity.id,
      ...setting,
    };
  }

  async getByKey(key: string): Promise<SysSettingsEntity | null> {
    if (!key) {
      return null;
    }
    return await this.repository.findOne({
      where: {
        key,
      },
    });
  }

  async getSettingByKey(key: string): Promise<any | null> {
    const entity = await this.getByKey(key);
    if (!entity) {
      return null;
    }
    return JSON.parse(entity.setting);
  }

  async save(bean: SysSettingsEntity) {
    const entity = await this.repository.findOne({
      where: {
        key: bean.key,
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

  async getSetting<T>(type: any): Promise<T> {
    const key = type.__key__;
    const cacheKey = type.getCacheKey();
    let settings: T = await this.cache.get(cacheKey);
    let settingInstance: T = new type();
    if (settings == null) {
      settings = await this.getSettingByKey(key);
      settingInstance = _.merge(settingInstance, settings);
      await this.cache.set(key, settingInstance);
    }
    return settingInstance;
  }

  async saveSetting<T extends BaseSettings>(bean: T) {
    const type: any = bean.constructor;
    const key = type.__key__;
    const cacheKey = type.getCacheKey();

    const entity = await this.getByKey(key);
    if (entity) {
      entity.setting = JSON.stringify(bean);
      await this.repository.save(entity);
    } else {
      const newEntity = new SysSettingsEntity();
      newEntity.key = key;
      newEntity.title = type.__title__;
      newEntity.setting = JSON.stringify(bean);
      newEntity.access = type.__access__;
      await this.repository.save(newEntity);
    }

    await this.cache.set(cacheKey, bean);
  }

  async getPublicSettings(): Promise<SysPublicSettings> {
    return await this.getSetting(SysPublicSettings);
  }

  async savePublicSettings(bean: SysPublicSettings) {
    await this.saveSetting(bean);
  }

  async savePrivateSettings(bean: SysPrivateSettings) {
    this.saveSetting(bean);
  }

  async updateByKey(key: string, setting: any) {
    const entity = await this.getByKey(key);
    if (entity) {
      entity.setting = JSON.stringify(setting);
      await this.repository.save(entity);
    } else {
      throw new Error('该设置不存在');
    }
    await this.cache.del(`settings.${key}`);
  }
}
