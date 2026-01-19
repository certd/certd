import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';
import { AliyunAccess } from '../../plugin-lib/aliyun/access/aliyun-access.js';
import { AliyunClient } from '../../plugin-lib/aliyun/index.js';
import { Pager, PageRes } from '@certd/pipeline';


@IsDnsProvider({
  name: 'aliyun',
  title: '阿里云',
  desc: '阿里云DNS解析提供商',
  accessType: 'aliyun',
  icon: 'svg:icon-aliyun',
  order:0,
})
export class AliyunDnsProvider extends AbstractDnsProvider {

  client: any;
  async onInstance() {
    const access: AliyunAccess = this.ctx.access as AliyunAccess

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

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord,hostRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, domain);
    // const domain = await this.matchDomain(fullRecord);
    const params = {
      RegionId: 'cn-hangzhou',
      DomainName: domain,
      RR: hostRecord,
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
      if(e.code === "LastOperationNotFinished"){
        this.logger.info('上一个操作还未完成，5s后重试')
        await this.ctx.utils.sleep(5000)
        return this.createRecord(options)
      }
      if (e.code === 'SignatureDoesNotMatch') {
        this.logger.error('阿里云账号的AccessKeyId或AccessKeySecret错误，请检查AccessKey是否被删除、过期、或者选择了错误的授权记录');
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
    try{
      const ret = await this.client.request('DeleteDomainRecord', params, requestOption);
      this.logger.info('删除域名解析成功:', fullRecord, value, ret.RecordId);
      return ret.RecordId;
    }catch (e) {
      if(e.code === "LastOperationNotFinished"){
        this.logger.info('上一个操作还未完成，5s后重试')
        await this.ctx.utils.sleep(5000)
        return this.removeRecord(options)
      }
      throw e
    }
  }

  async getDomainListPage(pager: Pager) :Promise<PageRes<DomainRecord>> {
    const params = {
      RegionId: 'cn-hangzhou',
      PageSize: pager.pageSize,
      PageNumber: pager.pageNo,
    };

    const requestOption = {
      method: 'POST',
    };

    const ret = await this.client.request(
      'DescribeDomains',
      params,
      requestOption
    );
    const list = ret.Domains?.Domain?.map(item => ({
      id: item.DomainId,
      domain: item.DomainName,
    })) || []

    return {
      list,
      total: ret.TotalCount,
    }
  }
}

new AliyunDnsProvider();
