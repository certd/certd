import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService, ListReq, SysPrivateSettings, SysSettingsService, ValidateException } from '@certd/lib-server';
import { CnameProviderEntity } from '../entity/cname-provider.js';
import { CommonProviders } from './common-provider.js';

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CnameProviderService extends BaseService<CnameProviderEntity> {
  @InjectEntityModel(CnameProviderEntity)
  repository: Repository<CnameProviderEntity>;

  @Inject()
  settingsService: SysSettingsService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async getDefault() {
    return await this.repository.findOne({ where: { isDefault: true, disabled: false } });
  }
  /**
   * 新增
   * @param param 数据
   */
  async add(param: any) {
    const def = await this.getDefault();
    if (!def) {
      param.isDefault = true;
    }
    const res = await super.add(param);
    if (param.isDefault) {
      await this.setDefault(res.id);
    }
    return res;
  }

  /**
   * 修改
   * @param param 数据
   */
  async update(param: any) {
    await super.update(param);
    if (param.isDefault) {
      await this.setDefault(param.id);
    }
  }

  //@ts-ignore
  async delete(ids: any) {
    if (!ids) {
      return;
    }
    if (!(ids instanceof Array)) {
      ids = [ids];
    }
    for (const id of ids) {
      const info = await this.info(id);
      if (info.isDefault) {
        throw new ValidateException('默认的CNAME服务不能删除，请先修改为非默认值');
      }
    }
    await super.delete(ids);
  }

  async setDefault(id: number) {
    await this.transaction(async em => {
      await em.getRepository(CnameProviderEntity).update({ isDefault: true }, { isDefault: false });
      await em.getRepository(CnameProviderEntity).update({ id }, { isDefault: true });
    });
  }

  async setDisabled(id: number, disabled: boolean) {
    await this.repository.update({ id }, { disabled });
  }

  async getByPriority() {
    const def = await this.getDefault();
    if (def) {
      return def;
    }
    const founds = await this.repository.find({ take: 1, order: { createTime: 'DESC' }, where: { disabled: false } });
    if (founds && founds.length > 0) {
      return founds[0];
    }

    const sysPrivateSettings = await this.settingsService.getSetting<SysPrivateSettings>(SysPrivateSettings);

    if (sysPrivateSettings.commonCnameEnabled !== false && CommonProviders.length > 0) {
      return CommonProviders[0] as CnameProviderEntity;
    }
    return null;
  }

  async getSubDomains() {
    const list = await this.repository.find({
      select: {
        subdomain: true,
      },
      where: {
        disabled: false,
      },
    });
    return list.map(item => item.subdomain?.trim()).filter((item): item is string => !!item);
  }

  async list(req: ListReq): Promise<any[]> {
    const list = await super.list(req);
    const sysPrivateSettings = await this.settingsService.getSetting<SysPrivateSettings>(SysPrivateSettings);

    if (sysPrivateSettings.commonCnameEnabled !== false) {
      return [...list, ...CommonProviders];
    }
    return list;
  }

  async info(id: any, infoIgnoreProperty?: any): Promise<any | null> {
    if (id < 0) {
      //使用公共provider
      return CommonProviders.find(p => p.id === id);
    }
    return await super.info(id, infoIgnoreProperty);
  }

}
