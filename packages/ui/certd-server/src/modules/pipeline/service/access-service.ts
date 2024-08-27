import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service.js';
import { AccessEntity } from '../entity/access.js';
import { AccessDefine, accessRegistry, IAccessService } from '@certd/pipeline';
import { EncryptService } from './encrypt-service.js';
import { ValidateException } from '../../../basic/exception/validation-exception.js';

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class AccessService extends BaseService<AccessEntity> implements IAccessService {
  @InjectEntityModel(AccessEntity)
  repository: Repository<AccessEntity>;

  @Inject()
  encryptService: EncryptService;

  getRepository() {
    return this.repository;
  }

  async page(query, page = { offset: 0, limit: 20 }, order, buildQuery) {
    const res = await super.page(query, page, order, buildQuery);
    res.records = res.records.map(item => {
      delete item.encryptSetting;
      return item;
    });
    return res;
  }

  async add(param) {
    this.encryptSetting(param, null);
    return await super.add(param);
  }

  encryptSetting(param: any, oldSettingEntity?: AccessEntity) {
    const accessType = param.type;
    const accessDefine: AccessDefine = accessRegistry.getDefine(accessType);
    if (!accessDefine) {
      throw new ValidateException(`授权类型${accessType}不存在`);
    }
    const setting = param.setting;
    if (!setting) {
      return;
    }
    const json = JSON.parse(setting);
    let oldSetting = {};
    let encryptSetting = {};
    const firstEncrypt = !oldSettingEntity.encryptSetting || oldSettingEntity.encryptSetting === '{}';
    if (oldSettingEntity) {
      oldSetting = JSON.parse(oldSettingEntity.setting || '{}');
      encryptSetting = JSON.parse(oldSettingEntity.encryptSetting || '{}');
    }
    for (const key in json) {
      //加密
      const value = json[key];
      const accessInputDefine = accessDefine.input[key];
      if (!accessInputDefine) {
        throw new ValidateException(`授权类型${accessType}不存在字段${key}`);
      }
      if (!accessInputDefine.encrypt || !value || typeof value !== 'string') {
        //定义无需加密、value为空、不是字符串 这些不需要加密
        encryptSetting[key] = {
          value: value,
          encrypt: false,
        };
        continue;
      }

      if (firstEncrypt || oldSetting[key] !== value) {
        //星号保护
        const length = value.length;
        const subIndex = Math.min(2, length);
        const starLength = length - subIndex * 2;
        const starString = '*'.repeat(starLength);
        json[key] = value.substring(0, subIndex) + starString + value.substring(value.length - subIndex);
        encryptSetting[key] = {
          value: this.encryptService.encrypt(value),
          encrypt: true,
        };
      }
      //未改变情况下，不做修改
    }
    param.encryptSetting = JSON.stringify(encryptSetting);
    param.setting = JSON.stringify(json);
  }
  /**
   * 修改
   * @param param 数据
   */
  async update(param) {
    const oldEntity = await this.info(param.id);
    if (oldEntity == null) {
      throw new ValidateException('该授权配置不存在,请确认是否已被删除');
    }
    this.encryptSetting(param, oldEntity);
    return await super.update(param);
  }

  async getById(id: any): Promise<any> {
    const entity = await this.info(id);
    if (entity == null) {
      throw new Error(`该授权配置不存在,请确认是否已被删除:id=${id}`);
    }
    // const access = accessRegistry.get(entity.type);
    let setting = {};
    if (entity.encryptSetting && entity.encryptSetting !== '{}') {
      setting = JSON.parse(entity.encryptSetting);
      for (const key in setting) {
        //解密
        const encryptValue = setting[key];
        let value = encryptValue.value;
        if (encryptValue.encrypt) {
          value = this.encryptService.decrypt(value);
        }
        setting[key] = value;
      }
    } else if (entity.setting) {
      setting = JSON.parse(entity.setting);
    }
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
