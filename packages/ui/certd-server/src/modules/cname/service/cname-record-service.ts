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
import { AccessService } from '../../pipeline/service/access-service.js';
import { isDev } from '../../../utils/env.js';
import { walkTxtRecord } from '@certd/acme-client';

type CnameCheckCacheValue = {
  validating: boolean;
  pass: boolean;
  recordReq?: any;
  recordRes?: any;
  startTime: number;
  intervalId?: NodeJS.Timeout;
};
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
    if (bean.status === 'valid') {
      return true;
    }

    const cacheKey = `cname.record.verify.${bean.id}`;

    let value: CnameCheckCacheValue = cache.get(cacheKey);
    if (!value) {
      value = {
        validating: false,
        pass: false,
        startTime: new Date().getTime(),
      };
    }
    let ttl = 60 * 60 * 15 * 1000;
    if (isDev()) {
      ttl = 30 * 1000;
    }
    const recordValue = bean.recordValue.substring(0, bean.recordValue.indexOf('.'));

    const buildDnsProvider = async () => {
      const cnameProvider = await this.cnameProviderService.info(bean.cnameProviderId);
      const access = await this.accessService.getById(cnameProvider.accessId, bean.userId);
      const context = { access, logger, http, utils };
      const dnsProvider: IDnsProvider = await createDnsProvider({
        dnsProviderType: cnameProvider.dnsProviderType,
        context,
      });
      return dnsProvider;
    };

    const checkRecordValue = async () => {
      if (value.pass) {
        return true;
      }
      if (value.startTime + ttl < new Date().getTime()) {
        logger.warn(`cname验证超时,停止检查,${bean.domain} ${recordValue}`);
        clearInterval(value.intervalId);
        await this.updateStatus(bean.id, 'cname');
        return false;
      }

      const originDomain = parseDomain(bean.domain);
      const fullDomain = `${bean.hostRecord}.${originDomain}`;

      logger.info(`检查CNAME配置 ${fullDomain} ${recordValue}`);

      // const txtRecords = await dns.promises.resolveTxt(fullDomain);
      // if (txtRecords.length) {
      //   records = [].concat(...txtRecords);
      // }
      let records: string[] = [];
      try {
        records = await walkTxtRecord(fullDomain);
      } catch (e) {
        logger.error(`获取TXT记录失败，${e.message}`);
      }
      logger.info(`检查到TXT记录 ${JSON.stringify(records)}`);
      const success = records.includes(recordValue);
      if (success) {
        clearInterval(value.intervalId);
        logger.info(`检测到CNAME配置,修改状态 ${fullDomain} ${recordValue}`);
        await this.updateStatus(bean.id, 'valid');
        value.pass = true;
        cache.delete(cacheKey);
        try {
          const dnsProvider = await buildDnsProvider();
          await dnsProvider.removeRecord({
            recordReq: value.recordReq,
            recordRes: value.recordRes,
          });
          logger.info('删除CNAME的校验DNS记录成功');
        } catch (e) {
          logger.error(`删除CNAME的校验DNS记录失败， ${e.message}，req:${JSON.stringify(value.recordReq)}，recordRes:${JSON.stringify(value.recordRes)}`, e);
        }
      }
      return success;
    };

    if (value.validating) {
      // lookup recordValue in dns
      return await checkRecordValue();
    }

    cache.set(cacheKey, value, {
      ttl: ttl,
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
    const dnsProvider = await buildDnsProvider();
    const recordRes = await dnsProvider.createRecord(req);
    value.validating = true;
    value.recordReq = req;
    value.recordRes = recordRes;
    await this.updateStatus(bean.id, 'validating');

    value.intervalId = setInterval(async () => {
      try {
        await checkRecordValue();
      } catch (e) {
        logger.error('检查cname出错：', e);
      }
    }, 10000);
  }

  async updateStatus(id: number, status: CnameRecordStatusType) {
    await this.getRepository().update(id, { status });
  }
}
