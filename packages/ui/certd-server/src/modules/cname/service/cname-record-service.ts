import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService, ValidateException } from '@certd/lib-server';
import { CnameRecordEntity, CnameRecordStatusType } from '../entity/cname-record.js';
import { v4 as uuidv4 } from 'uuid';
import { CnameProviderService } from '../../sys/cname/service/cname-provider-service.js';
import { CnameProviderEntity } from '../../sys/cname/entity/cname_provider.js';
import { createDnsProvider, IDnsProvider, parseDomain } from '@certd/plugin-cert';
import { cache, http, logger, utils } from '@certd/pipeline';
import dns from 'dns';
import { AccessService } from '../../pipeline/service/access-service.js';

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

  @Inject()
  accessService: AccessService;
  //@ts-ignore
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

  /**
   * 验证是否配置好cname
   * @param id
   */
  async verify(id: string) {
    const bean = await this.info(id);
    if (!bean) {
      throw new ValidateException(`CnameRecord:${id} 不存在`);
    }
    const cacheKey = `cname.record.verify.${bean.id}`;

    type CacheValue = {
      ready: boolean;
      pass: boolean;
    };
    let value: CacheValue = cache.get(cacheKey);
    if (!value) {
      value = {
        ready: false,
        pass: false,
      };
    }

    const originDomain = parseDomain(bean.domain);
    const fullDomain = `${bean.hostRecord}.${originDomain}`;
    const recordValue = bean.recordValue.substring(0, bean.recordValue.indexOf('.'));
    const checkRecordValue = async () => {
      logger.info(`检查CNAME配置 ${fullDomain} ${recordValue}`);
      const txtRecords = await dns.promises.resolveTxt(fullDomain);
      let records: string[] = [];
      if (txtRecords.length) {
        records = [].concat(...txtRecords);
      }
      logger.info(`检查到TXT记录 ${JSON.stringify(records)}`);
      const success = records.includes(recordValue);
      if (success) {
        logger.info(`检测到CNAME配置,修改状态 ${fullDomain} ${recordValue}`);
        await this.updateStatus(bean.id, 'valid');
        value.pass = true;
      }
    };

    if (value.ready) {
      // lookup recordValue in dns
      return await checkRecordValue();
    }

    const ttl = 60 * 60 * 30;
    cache.set(cacheKey, value, {
      ttl: ttl,
    });

    const cnameProvider = await this.cnameProviderService.info(bean.cnameProviderId);
    const access = await this.accessService.getById(cnameProvider.accessId, bean.userId);
    const context = { access, logger, http, utils };
    const dnsProvider: IDnsProvider = await createDnsProvider({
      dnsProviderType: cnameProvider.dnsProviderType,
      context,
    });
    const domain = parseDomain(bean.recordValue);
    const fullRecord = bean.recordValue;
    const hostRecord = fullRecord.replace(`.${domain}`, '');
    const req = {
      domain: domain,
      fullRecord: fullRecord,
      hostRecord: hostRecord,
      type: 'TXT',
      value: recordValue,
    };
    await dnsProvider.createRecord(req);
    value.ready = true;
  }

  async updateStatus(id: number, status: CnameRecordStatusType) {
    await this.getRepository().update(id, { status });
  }
}
