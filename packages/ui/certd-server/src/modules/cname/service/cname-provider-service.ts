import { Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService, ValidateException } from '@certd/lib-server';
import { CnameProviderEntity } from '../entity/cname_provider.js';

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class CnameProviderService extends BaseService<CnameProviderEntity> {
  @InjectEntityModel(CnameProviderEntity)
  repository: Repository<CnameProviderEntity>;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async getDefault() {
    return await this.repository.findOne({ where: { isDefault: true } });
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
    const founds = await this.repository.find({ take: 1, order: { createTime: 'DESC' } });
    if (founds && founds.length > 0) {
      return founds[0];
    }
    return null;
  }
}
