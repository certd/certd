import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/decorator';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service';
import { SysSettingsEntity } from '../entity/sys-settings';
import { CacheManager } from '@midwayjs/cache';

const SYS_PUBLIC_KEY = 'sys.public';
const SYS_PRIVATE_KEY = 'sys.private';
const CACHE_SYS_PUBLIC_KEY = `settings.${SYS_PUBLIC_KEY}`;
const CACHE_SYS_PRIVATE_KEY = `settings.${SYS_PRIVATE_KEY}`;
export type SysPublicSettings = {
  registerEnabled: boolean;
};

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

  async getPublicSettings(): Promise<SysPublicSettings> {
    const key = CACHE_SYS_PUBLIC_KEY;
    let settings: SysPublicSettings = await this.cache.get(key);
    if (settings == null) {
      settings = await this.readPublicSettings();
      await this.cache.set(key, settings);
    }
    return settings;
  }

  async readPublicSettings(): Promise<SysPublicSettings> {
    const key = SYS_PUBLIC_KEY;
    const entity = await this.getByKey(key);
    if (!entity) {
      return {
        registerEnabled: false,
      };
    }
    return JSON.parse(entity.setting);
  }

  async savePublicSettings(bean: SysPublicSettings) {
    const key = SYS_PUBLIC_KEY;
    const entity = await this.getByKey(key);
    if (entity) {
      entity.setting = JSON.stringify(bean);
      await this.repository.save(entity);
    } else {
      const newEntity = new SysSettingsEntity();
      newEntity.key = key;
      newEntity.title = '系统公共设置';
      newEntity.setting = JSON.stringify(bean);
      newEntity.access = 'public';
      await this.repository.save(newEntity);
    }
    await this.cache.del(CACHE_SYS_PRIVATE_KEY);
  }

  async readPrivateSettings(): Promise<SysPrivateSettings> {
    const key = SYS_PRIVATE_KEY;
    const entity = await this.getByKey(key);
    if (!entity) {
      return {};
    }
    return JSON.parse(entity.setting);
  }

  async savePrivateSettings(bean: SysPrivateSettings) {
    const key = SYS_PRIVATE_KEY;
    const entity = await this.getByKey(key);
    if (entity) {
      entity.setting = JSON.stringify(bean);
      await this.repository.save(entity);
    } else {
      const newEntity = new SysSettingsEntity();
      newEntity.key = key;
      newEntity.title = '系统私有设置';
      newEntity.setting = JSON.stringify(bean);
      newEntity.access = 'private';
      await this.repository.save(newEntity);
    }
    await this.cache.del(CACHE_SYS_PRIVATE_KEY);
  }
}
