import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { BaseService, BaseSettings } from "@certd/lib-server";
import { UserSettingsEntity } from "../entity/user-settings.js";
import { LocalCache, mergeUtils } from "@certd/basic";
import { UserStatisticSetting } from "./models.js";
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

  async getByKey(key: string, userId: number, projectId?: number): Promise<UserSettingsEntity | null> {
    if (userId == null) {
      throw new Error("userId is required");
    }
    if (!key) {
      return null;
    }
    const userProjectQuery = this.buildUserProjectQuery(userId, projectId);
    return await this.repository.findOne({
      where: {
        key,
        ...userProjectQuery,
      },
    });
  }

  async getSettingByKey(key: string, userId: number, projectId?: number): Promise<any | null> {
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
    const userProjectQuery = this.buildUserProjectQuery(bean.userId, bean.projectId);
    const entity = await this.repository.findOne({
      where: {
        key: bean.key,
        ...userProjectQuery,
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

  async getSetting<T>(userId: number, projectId: number | undefined, type: any, cache = false): Promise<T> {
    if (userId == null) {
      throw new Error("userId is required");
    }
    const key = type.__key__;
    let cacheKey = key + "_" + userId;
    if (projectId != null) {
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

  async saveSetting<T extends BaseSettings>(userId: number, projectId: number | undefined, bean: T) {
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

  async incrementStatistic(userId: number, projectId: number | null | undefined, field: keyof UserStatisticSetting["genCertCount"]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.repository.manager.transaction("SERIALIZABLE", async manager => {
          const repo = manager.getRepository(UserSettingsEntity);
          const query = this.buildUserProjectQuery(userId, projectId);
          let entity = await repo.findOne({ where: { key: UserStatisticSetting.__key__, ...query }, lock: { mode: "pessimistic_write" } });
          const savedSetting = entity ? JSON.parse(entity.setting || "{}") : {};
          const setting = this.normalizeStatisticSetting(savedSetting);
          setting.genCertCount[field] += 1;
          if (!entity) {
            entity = new UserSettingsEntity();
            entity.userId = userId;
            entity.projectId = projectId;
            entity.key = UserStatisticSetting.__key__;
            entity.title = UserStatisticSetting.__title__;
          }
          entity.setting = JSON.stringify(setting);
          await repo.save(entity);
        });
        return;
      } catch (error: any) {
        const retryable = error?.code === "40001" || error?.code === "40P01" || error?.code === "ER_LOCK_DEADLOCK";
        if (!retryable || attempt === 2) {
          throw error;
        }
      }
    }
  }

  normalizeStatisticSetting(savedSetting: any): UserStatisticSetting {
    const setting = merge(new UserStatisticSetting(), savedSetting);
    const legacySetting = savedSetting as Partial<Record<keyof UserStatisticSetting["genCertCount"], number>>;
    for (const field of Object.keys(setting.genCertCount) as (keyof UserStatisticSetting["genCertCount"])[]) {
      if (setting.genCertCount[field] === 0 && legacySetting[field] != null) {
        setting.genCertCount[field] = Number(legacySetting[field]) || 0;
      }
    }
    return setting;
  }
}
