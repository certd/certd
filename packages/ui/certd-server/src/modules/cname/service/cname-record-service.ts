import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService, ValidateException } from '@certd/lib-server';
import { CnameRecordEntity } from '../entity/cname-record.js';
import { v4 as uuidv4 } from 'uuid';
import { CnameProviderService } from '../../sys/cname/service/cname-provider-service.js';
import { CnameProviderEntity } from '../../sys/cname/entity/cname_provider.js';
import { parseDomain } from '@certd/plugin-cert';

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class CnameRecordService extends BaseService<CnameRecordEntity> {
  @InjectEntityModel(CnameRecordEntity)
  repository: Repository<CnameRecordEntity>;

  @Inject()
  cnameProviderService: CnameProviderService;
  getRepository() {
    return this.repository;
  }
  /**
   * 新增
   * @param param 数据
   */
  async add(param: any): Promise<CnameRecordEntity> {
    if (!param.domain) {
      throw new ValidateException('域名不能为空');
    }
    if (!param.userId) {
      throw new ValidateException('userId不能为空');
    }
    if (param.domain.startsWith('*.')) {
      param.domain = param.domain.substring(2);
    }
    const info = await this.getRepository().findOne({ where: { domain: param.domain } });
    if (info) {
      return info;
    }

    let cnameProvider: CnameProviderEntity = null;
    if (!param.cnameProviderId) {
      //获取默认的cnameProviderId
      cnameProvider = await this.cnameProviderService.getByPriority();
      if (cnameProvider == null) {
        throw new ValidateException('找不到CNAME服务，请先联系管理员添加CNAME服务');
      }
    } else {
      cnameProvider = await this.cnameProviderService.info(param.cnameProviderId);
    }
    this.cnameProviderChanged(param, cnameProvider);

    param.status = 'cname';
    const { id } = await super.add(param);
    return await this.info(id);
  }

  private cnameProviderChanged(param: any, cnameProvider: CnameProviderEntity) {
    param.cnameProviderId = cnameProvider.id;

    const realDomain = parseDomain(param.domain);
    const prefix = param.domain.replace(realDomain, '');
    let hostRecord = `_acme-challenge.${prefix}`;
    if (hostRecord.endsWith('.')) {
      hostRecord = hostRecord.substring(0, hostRecord.length - 1);
    }
    param.hostRecord = hostRecord;

    const cnameKey = uuidv4().replaceAll('-', '');
    param.recordValue = `${cnameKey}.${cnameProvider.domain}`;
  }

  async update(param: any) {
    if (!param.id) {
      throw new ValidateException('id不能为空');
    }

    const old = await this.info(param.id);
    if (!old) {
      throw new ValidateException('数据不存在');
    }
    if (old.domain !== param.domain) {
      throw new ValidateException('域名不允许修改');
    }
    if (old.cnameProviderId !== param.cnameProviderId) {
      const cnameProvider = await this.cnameProviderService.info(param.cnameProviderId);
      this.cnameProviderChanged(param, cnameProvider);
      param.status = 'cname';
    }
    return await super.update(param);
  }

  async validate(id: number) {
    const info = await this.info(id);
    if (info.status === 'success') {
      return true;
    }

    //开始校验
    // 1.  dnsProvider
    // 2.  添加txt记录
    // 3.  检查原域名是否有cname记录
  }

  async getByDomain(domain: string, userId: number, createOnNotFound = true) {
    if (!domain) {
      throw new ValidateException('domain不能为空');
    }
    if (userId == null) {
      throw new ValidateException('userId不能为空');
    }
    let record = await this.getRepository().findOne({ where: { domain, userId } });
    if (record == null) {
      if (createOnNotFound) {
        record = await this.add({ domain, userId });
      } else {
        throw new ValidateException(`找不到${domain}的CNAME记录`);
      }
    }
    const provider = await this.cnameProviderService.info(record.cnameProviderId);
    if (provider == null) {
      throw new ValidateException(`找不到${domain}的CNAME服务`);
    }

    return {
      ...record,
      cnameProvider: provider,
    };
  }
}
