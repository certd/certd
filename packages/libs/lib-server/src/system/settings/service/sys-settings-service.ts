import { Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { SysSettingsEntity } from '../entity/sys-settings.js';
import { BaseSettings, SysInstallInfo, SysPrivateSettings, SysPublicSettings, SysSecret, SysSecretBackup } from './models.js';

import { getAllSslProviderDomains, setSslProviderReverseProxies, setWalkFromAuthoritative } from '@certd/acme-client';
import { cache, logger, mergeUtils, setGlobalHeaders, setGlobalProxy } from '@certd/basic';
import { isPlus } from '@certd/plus-core';
import * as dns from 'node:dns';
import { BaseService, setAdminMode } from '../../../basic/index.js';
import { executorQueue } from '../../basic/service/executor-queue.js';
const { merge } = mergeUtils;

let lastSaveEnvVars = {};
/**
 * 设置
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class SysSettingsService extends BaseService<SysSettingsEntity> {
  @InjectEntityModel(SysSettingsEntity)
  repository: Repository<SysSettingsEntity>;

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
    const settings: T = cache.get(cacheKey);
    if (settings) {
      return settings;
    }
    let newSetting: T = new type();
    const savedSettings = await this.getSettingByKey(key);
    newSetting = merge(newSetting, savedSettings);
    await this.saveSetting(newSetting);
    cache.set(cacheKey, newSetting);
    return newSetting;
  }

  async saveSetting<T extends BaseSettings>(bean: T) {
    const type: any = bean.constructor;
    const key = type.__key__;
    const cacheKey = type.getCacheKey();

    const entity = await this.getByKey(key);
    if (entity) {
      entity.setting = JSON.stringify(bean);
      entity.access = type.__access__;

      if (key === SysSecretBackup.__key__) {
        //备份密钥不允许更新
        return;
      }

      await this.repository.save(entity);
    } else {
      const newEntity = new SysSettingsEntity();
      newEntity.key = key;
      newEntity.title = type.__title__;
      newEntity.setting = JSON.stringify(bean);
      newEntity.access = type.__access__;
      await this.repository.save(newEntity);
    }

    cache.set(cacheKey, bean);
  }

  async getPublicSettings(): Promise<SysPublicSettings> {
    return await this.getSetting(SysPublicSettings);
  }

  async savePublicSettings(bean: SysPublicSettings) {
    // if (isComm()) {
    //   if (bean.adminMode === 'enterprise') {
    //     throw new Error("商业版不支持使用企业管理模式")
    //   }
    // }

    await this.saveSetting(bean);
    //让设置生效
    await this.reloadPublicSettings();
  }

  async getPrivateSettings(): Promise<SysPrivateSettings> {
    const res = await this.getSetting<SysPrivateSettings>(SysPrivateSettings);
    const sslProviderDomains = getAllSslProviderDomains();
    for (const domain of sslProviderDomains) {
      if (!res.reverseProxies[domain]) {
        res.reverseProxies[domain] = "";
      }
    }
    return res
  }

  async savePrivateSettings(bean: SysPrivateSettings) {
    await this.saveSetting(bean);

    //让设置生效
    await this.reloadPrivateSettings();
  }

  async reloadSettings() {
    await this.reloadPrivateSettings()
    await this.reloadPublicSettings()
  }

  async reloadPublicSettings() {
    const publicSetting = await this.getPublicSettings()
    if (isPlus()){
      setAdminMode(publicSetting.adminMode  ) 
    }
  }

  async reloadPrivateSettings() {
    const privateSetting = await this.getPrivateSettings();
    const opts = {
      httpProxy: privateSetting.httpProxy,
      httpsProxy: privateSetting.httpsProxy,
      noProxy: privateSetting.noProxy,
    };
    setGlobalProxy(opts);
    setGlobalHeaders(this.parseKeyValueText(privateSetting.commonHeaders));
    
    dns.setDefaultResultOrder(privateSetting.dnsResultOrder as any || 'ipv4first');

    if (privateSetting.pipelineMaxRunningCount) {
      executorQueue.setMaxRunningCount(privateSetting.pipelineMaxRunningCount);
    }

    setSslProviderReverseProxies(privateSetting.reverseProxies);

    //加载环境变量
    this.setEnvironmentVars(privateSetting.environmentVars);

    setWalkFromAuthoritative(privateSetting.acmeWalkFromAuthoritative);
    
  }

  parseKeyValueText(text: string) {
    const values = {};
    if (typeof text !== 'string') {
      text = "";
    }
    text.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) {
        return
      }

      const arr = line.split("#")
      if (arr.length > 0) {
        line = arr[0].trim();
      }
      if (!line.includes("=")) {
        return
      }

      const eqIndex = line.indexOf('=');
      const key = line.substring(0, eqIndex).trim();
      const value = line.substring(eqIndex + 1).trim();
      if (key && value) {
        values[key] = value;
      }
    });
    return values;
  }

  setEnvironmentVars(vars: string) {
    const envVars = this.parseKeyValueText(vars);
    //先删除旧环境变量
    if (lastSaveEnvVars) {
      for (const key in lastSaveEnvVars) {
          delete process.env[key];
      }
    }

    merge(process.env, envVars);
    lastSaveEnvVars = envVars;
  }

  async updateByKey(key: string, setting: any) {
    const entity = await this.getByKey(key);
    if (entity) {
      entity.setting = JSON.stringify(setting);
      await this.repository.save(entity);
    } else {
      throw new Error('该设置不存在');
    }
    cache.delete(`settings.${key}`);
  }

  async backupSecret() {
    const settings = await this.getSettingByKey(SysSecretBackup.__key__);
    const privateSettings = await this.getPrivateSettings();
    const installInfo = await this.getSetting<SysInstallInfo>(SysInstallInfo);
    if (settings == null) {
      const backup = new SysSecretBackup();
      if (installInfo.siteId == null || privateSettings.encryptSecret == null) {
        logger.error('备份密钥失败，siteId或encryptSecret为空');
        return;
      }
      backup.siteId = installInfo.siteId;
      backup.encryptSecret = privateSettings.encryptSecret;
      await this.saveSetting(backup);
      logger.info('备份密钥成功');
    } else {
      //校验是否有变化
      if (settings.siteId !== installInfo.siteId) {
        throw new Error(`siteId与备份不一致，可能是数据异常，请检查：backup=${settings.siteId}, current=${installInfo.siteId}`);
      }
      if (settings.encryptSecret !== privateSettings.encryptSecret) {
        throw new Error('encryptSecret与备份不一致，可能是数据异常，请检查');
      }
    }
  }
  async getSecret() {
    const sysSecret = await this.getSetting<SysSecret>(SysSecret);
    if (sysSecret.encryptSecret) {
      return sysSecret;
    }
    //从备份中读取
    const settings = await this.getSettingByKey(SysSecretBackup.__key__);
    if (settings == null || !settings.encryptSecret) {
      throw new Error('密钥备份不存在');
    }
    sysSecret.siteId = settings.siteId;
    sysSecret.encryptSecret = settings.encryptSecret;
    await this.saveSetting(sysSecret);
    logger.info('密钥恢复成功');
    return sysSecret;
  }
}
