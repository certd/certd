import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';
import { Autowire } from '@certd/pipeline';

import { AliyunAccess, AliyunClient } from '@certd/plugin-lib';

@IsDnsProvider({
  name: 'aliyun',
  title: '阿里云',
  desc: '阿里云DNS解析提供商',
  accessType: 'aliyun',
  icon: 'svg:icon-aliyun',
})
export class AliyunDnsProvider extends AbstractDnsProvider {
  client: any;
  @Autowire()
  access!: AliyunAccess;
  async onInstance() {
    const access: any = this.access;

    this.client = new AliyunClient({ logger: this.logger });
    await this.client.init({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      endpoint: 'https://alidns.aliyuncs.com',
      apiVersion: '2015-01-09',
    });
  }
  //
  // async getDomainList() {
  //   const params = {
  //     RegionId: 'cn-hangzhou',
  //     PageSize: 100,
  //   };
  //
  //   const requestOption = {
  //     method: 'POST',
  //   };
  //
  //   const ret = await this.client.request(
  //     'DescribeDomains',
  //     params,
  //     requestOption
  //   );
  //   return ret.Domains.Domain;
  // }
  //
  // async matchDomain(dnsRecord: string) {
  //   const list = await this.getDomainList();
  //   let domain = null;
  //   const domainList = [];
  //   for (const item of list) {
  //     domainList.push(item.DomainName);
  //     if (_.endsWith(dnsRecord, item.DomainName)) {
  //       domain = item.DomainName;
  //       break;
  //     }
  //   }
  //   if (!domain) {
  //     throw new Error(
  //       `can not find Domain :${dnsRecord} ,list: ${JSON.stringify(domainList)}`
  //     );
  //   }
  //   return domain;
  // }
  //
  // async getRecords(domain: string, rr: string, value: string) {
  //   const params: any = {
  //     RegionId: 'cn-hangzhou',
  //     DomainName: domain,
  //     RRKeyWord: rr,
  //     ValueKeyWord: undefined,
  //   };
  //   if (value) {
  //     params.ValueKeyWord = value;
  //   }
  //
  //   const requestOption = {
  //     method: 'POST',
  //   };
  //
  //   const ret = await this.client.request(
  //     'DescribeDomainRecords',
  //     params,
  //     requestOption
  //   );
  //   return ret.DomainRecords.Record;
  // }

  async #processRRAndSubDomain(fullRecord: string, baseDomain: string): Promise<{ rr: string; domainName: string }> {
    const expectRR = fullRecord.replace('.' + baseDomain, '');
    const subDomains = expectRR.split('.');
    if (subDomains.length === 0) {
      return { rr: '@', domainName: baseDomain };
    }
    const params = {
      RegionId: 'cn-hangzhou',
      KeyWord: `%${baseDomain}`,
      PageSize: 100,
    };

    const requestOption = {
      method: 'POST',
    };

    const ret = await this.client.request('DescribeDomains', params, requestOption);
    const domainNames = new Set((ret.Domains.Domain as { DomainName: string }[]).map(domain => domain.DomainName));

    for (let i = 0; i < subDomains.length; i++) {
      const domain = subDomains.slice(i, subDomains.length).join('.') + '.' + baseDomain;
      if (domainNames.has(domain)) {
        const rr = subDomains.slice(0, i).join('.');
        this.logger.info('在域名列表中发现匹配的(子)域名,使用新的rr与域名', rr, domain);
        return { rr, domainName: domain };
      }
    }
    return { rr: subDomains.join('.'), domainName: baseDomain };
  }

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, domain);
    // const domain = await this.matchDomain(fullRecord);

    let rr: string;
    let domainName: string;
    try {
      const processResult = await this.#processRRAndSubDomain(fullRecord, domain);
      rr = processResult.rr;
      domainName = processResult.domainName;
    } catch (e) {
      this.logger.info('获取域名列表出错', e);
      this.resolveError(e, options);
      return;
    }

    const params = {
      RegionId: 'cn-hangzhou',
      DomainName: domainName,
      RR: rr,
      Type: type,
      Value: value,
      // Line: 'oversea' // 海外
    };

    const requestOption = {
      method: 'POST',
    };

    try {
      const ret = await this.client.request('AddDomainRecord', params, requestOption);
      this.logger.info('添加域名解析成功:', JSON.stringify(options), ret.RecordId);
      return ret.RecordId;
    } catch (e: any) {
      if (e.code === 'DomainRecordDuplicate') {
        return;
      }
      this.logger.info('添加域名解析出错', e);
      this.resolveError(e, options);
    }
  }

  resolveError(e: any, req: CreateRecordOptions) {
    if (e.message?.indexOf('The specified domain name does not exist') > -1) {
      throw new Error(`阿里云账号中不存在此域名:${req.domain}`);
    }
    throw e;
  }
  async removeRecord(options: RemoveRecordOptions<any>): Promise<any> {
    const { fullRecord, value } = options.recordReq;
    const record = options.recordRes;
    const params = {
      RegionId: 'cn-hangzhou',
      RecordId: record,
    };

    const requestOption = {
      method: 'POST',
    };

    const ret = await this.client.request('DeleteDomainRecord', params, requestOption);
    this.logger.info('删除域名解析成功:', fullRecord, value, ret.RecordId);
    return ret.RecordId;
  }
}

new AliyunDnsProvider();
