import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService, PageReq, PermissionException, ValidateException } from '@certd/lib-server';
import { AccessEntity } from '../entity/access.js';
import { AccessDefine, accessRegistry, newAccess } from '@certd/pipeline';
import { EncryptService } from './encrypt-service.js';

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class AccessService extends BaseService<AccessEntity> {
  @InjectEntityModel(AccessEntity)
  repository: Repository<AccessEntity>;

  @Inject()
  encryptService: EncryptService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async page(pageReq: PageReq<AccessEntity>) {
    const res = await super.page(pageReq);
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
    const firstEncrypt = !oldSettingEntity || !oldSettingEntity.encryptSetting || oldSettingEntity.encryptSetting === '{}';
    if (oldSettingEntity) {
      oldSetting = JSON.parse(oldSettingEntity.setting || '{}');
      encryptSetting = JSON.parse(oldSettingEntity.encryptSetting || '{}');
    }
    for (const key in json) {
      //加密
      const value = json[key];
      const accessInputDefine = accessDefine.input[key];
      if (!accessInputDefine) {
        continue;
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
        let starLength = length - subIndex * 2;
        starLength = Math.max(2, starLength);
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

  async getById(id: any, userId: number): Promise<any> {
    const entity = await this.info(id);
    if (entity == null) {
      throw new Error(`该授权配置不存在,请确认是否已被删除:id=${id}`);
    }
    if (userId !== entity.userId && entity.userId !== 0) {
      throw new PermissionException('您对该Access授权无访问权限');
    }
    // const access = accessRegistry.get(entity.type);
    const setting = this.decryptAccessEntity(entity);
    const input = {
      id: entity.id,
      ...setting,
    };
    return newAccess(entity.type, input);
  }

  decryptAccessEntity(entity: AccessEntity): any {
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
    return setting;
  }

  getDefineList() {
    return accessRegistry.getDefineList();
  }

  getDefineByType(type: string) {
    return accessRegistry.getDefine(type);
  }
}
