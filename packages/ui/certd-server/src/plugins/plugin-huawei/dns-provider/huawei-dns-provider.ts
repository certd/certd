import * as _ from 'lodash-es';
import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';
import { Autowire, ILogger } from '@certd/pipeline';
import { HuaweiAccess } from '../access/index.js';
import { ApiRequestOptions, HuaweiYunClient } from '@certd/lib-huawei';

export type SearchRecordOptions = {
  zoneId: string;
} & CreateRecordOptions;

@IsDnsProvider({
  name: 'huawei',
  title: '华为云',
  desc: '华为云DNS解析提供商',
  accessType: 'huawei',
})
export class HuaweiDnsProvider extends AbstractDnsProvider {
  client!: HuaweiYunClient;
  @Autowire()
  access!: HuaweiAccess;
  @Autowire()
  logger!: ILogger;
  domainEndpoint = 'https://domains-external.myhuaweicloud.com';
  dnsEndpoint = 'https://dns.cn-south-1.myhuaweicloud.com';
  async onInstance() {
    const access: any = this.access;
    this.client = new HuaweiYunClient(access);
  }

  async getDomainList() {
    const url = `${this.dnsEndpoint}/v2/zones`;
    const ret = await this.client.request({
      url,
      method: 'GET',
    });
    return ret.zones;
  }

  async matchDomain(dnsRecord: string) {
    const zoneList = await this.getDomainList();
    let zoneRecord = null;
    for (const item of zoneList) {
      if (_.endsWith(dnsRecord + '.', item.name)) {
        zoneRecord = item;
        break;
      }
    }
    if (!zoneRecord) {
      throw new Error('can not find Domain ,' + dnsRecord);
    }
    return zoneRecord;
  }

  async searchRecord(options: SearchRecordOptions): Promise<any> {
    const req: ApiRequestOptions = {
      url: `${this.dnsEndpoint}/v2/zones/${options.zoneId}/recordsets?name=${options.fullRecord}.`,
      method: 'GET',
    };
    const ret = await this.client.request(req);
    return ret.recordsets;
  }

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type } = options;
    this.logger.info('添加域名解析：', fullRecord, value);
    const zoneRecord = await this.matchDomain(fullRecord);
    const zoneId = zoneRecord.id;

    const records: any = await this.searchRecord({
      zoneId,
      ...options,
    });
    if (records && records.length > 0) {
      for (const record of records) {
        await this.removeRecord({
          record,
          ...options,
        });
      }
    }

    try {
      const req: ApiRequestOptions = {
        url: `${this.dnsEndpoint}/v2/zones/${zoneId}/recordsets`,
        method: 'POST',
        data: {
          name: fullRecord + '.',
          type,
          records: [`"${value}"`],
        },
      };
      const ret = await this.client.request(req);
      this.logger.info('添加域名解析成功:', value, ret);
      return ret;
    } catch (e: any) {
      if (e.code === 'DNS.0312') {
        return;
      }
      this.logger.info('添加域名解析出错', e);
      throw e;
    }
  }
  async removeRecord(options: RemoveRecordOptions<any>): Promise<any> {
    const { fullRecord, value, record } = options;
    const req: ApiRequestOptions = {
      url: `${this.dnsEndpoint}/v2/zones/${record.zone_id}/recordsets/${record.id}`,
      method: 'DELETE',
    };

    const ret = await this.client.request(req);
    this.logger.info('删除域名解析成功:', fullRecord, value, ret.RecordId);
    return ret.RecordId;
  }
}

new HuaweiDnsProvider();
