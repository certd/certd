import Core from '@alicloud/pop-core';
import {
  AbstractDnsProvider,
  CreateRecordOptions,
  IsDnsProvider,
  RemoveRecordOptions,
} from '@certd/plugin-cert';
import { Autowire, ILogger } from '@certd/pipeline';
import { AliyunAccess } from '../access/index.js';

@IsDnsProvider({
  name: 'aliyun',
  title: '阿里云',
  desc: '阿里云DNS解析提供商',
  accessType: 'aliyun',
})
export class AliyunDnsProvider extends AbstractDnsProvider {
  client: any;
  @Autowire()
  access!: AliyunAccess;
  @Autowire()
  logger!: ILogger;
  async onInstance() {
    const access: any = this.access;
    this.client = new Core({
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

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, domain);
    // const domain = await this.matchDomain(fullRecord);
    const rr = fullRecord.replace('.' + domain, '');

    const params = {
      RegionId: 'cn-hangzhou',
      DomainName: domain,
      RR: rr,
      Type: type,
      Value: value,
      // Line: 'oversea' // 海外
    };

    const requestOption = {
      method: 'POST',
    };

    try {
      const ret = await this.client.request(
        'AddDomainRecord',
        params,
        requestOption
      );
      this.logger.info('添加域名解析成功:', value, value, ret.RecordId);
      return ret.RecordId;
    } catch (e: any) {
      if (e.code === 'DomainRecordDuplicate') {
        return;
      }
      this.logger.info('添加域名解析出错', e);
      throw e;
    }
  }
  async removeRecord(options: RemoveRecordOptions<any>): Promise<any> {
    const { fullRecord, value, record } = options;
    const params = {
      RegionId: 'cn-hangzhou',
      RecordId: record,
    };

    const requestOption = {
      method: 'POST',
    };

    const ret = await this.client.request(
      'DeleteDomainRecord',
      params,
      requestOption
    );
    this.logger.info('删除域名解析成功:', fullRecord, value, ret.RecordId);
    return ret.RecordId;
  }
}

new AliyunDnsProvider();
