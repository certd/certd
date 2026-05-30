import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { BaseService, BaseSettings } from "@certd/lib-server";
import { UserSettingsEntity } from "../entity/user-settings.js";
import { LocalCache, mergeUtils } from "@certd/basic";
const { merge } = mergeUtils;

const UserSettingCache = new LocalCache({
  clearInterval: 5 * 60 * 1000,
});

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class UserSettingsService extends BaseService<UserSettingsEntity> {
  @InjectEntityModel(UserSettingsEntity)
  repository: Repository<UserSettingsEntity>;

  //@ts-ignore
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

  async getByKey(key: string, userId: number, projectId: number): Promise<UserSettingsEntity | null> {
    if (userId == null) {
      throw new Error("userId is required");
    }
    if (!key) {
      return null;
    }
    return await this.repository.findOne({
      where: {
        key,
        userId,
        projectId,
      },
    });
  }

  async getSettingByKey(key: string, userId: number, projectId: number): Promise<any | null> {
    if (userId == null) {
      throw new Error("userId is required");
    }
    const entity = await this.getByKey(key, userId, projectId);
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
        projectId: bean.projectId,
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

  async getSetting<T>(userId: number, projectId: number, type: any, cache = false): Promise<T> {
    if (userId == null) {
      throw new Error("userId is required");
    }
    const key = type.__key__;
    let cacheKey = key + "_" + userId;
    if (projectId) {
      cacheKey += "_" + projectId;
    }

    if (cache) {
      const settings: T = UserSettingCache.get(cacheKey);
      if (settings) {
        return settings;
      }
    }

    let newSetting: T = new type();
    const savedSettings = await this.getSettingByKey(key, userId, projectId);
    newSetting = merge(newSetting, savedSettings);

    if (cache) {
      UserSettingCache.set(cacheKey, newSetting);
    }
    return newSetting;
  }

  async saveSetting<T extends BaseSettings>(userId: number, projectId: number, bean: T) {
    if (userId == null) {
      throw new Error("userId is required");
    }
    const old = await this.getSetting(userId, projectId, bean.constructor);
    bean = merge(old, bean);

    const type: any = bean.constructor;
    const key = type.__key__;
    if (!key) {
      throw new Error(`${type.name} must have __key__`);
    }
    const entity = await this.getByKey(key, userId, projectId);
    const newEntity = new UserSettingsEntity();
    if (entity) {
      newEntity.id = entity.id;
    } else {
      newEntity.key = key;
      newEntity.title = type.__title__;
      newEntity.userId = userId;
      newEntity.projectId = projectId;
    }
    newEntity.setting = JSON.stringify(bean);
    await this.repository.save(newEntity);
  }
}
