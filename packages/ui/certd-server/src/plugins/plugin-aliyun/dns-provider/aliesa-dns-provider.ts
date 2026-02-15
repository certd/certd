import { PageRes, PageSearch } from '@certd/pipeline';
import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';
import { AliesaAccess } from '../../plugin-lib/aliyun/index.js';
import { AliyunClientV2 } from '../../plugin-lib/aliyun/lib/aliyun-client-v2.js';


@IsDnsProvider({
  name: 'aliesa',
  title: '阿里ESA',
  desc: '阿里ESA DNS解析',
  accessType: 'aliesa',
  icon: 'svg:icon-aliyun',
  order: 0,
})
export class AliesaDnsProvider extends AbstractDnsProvider {


  client: AliyunClientV2
  async onInstance() {
    const access : AliesaAccess = this.ctx.access as AliesaAccess
    this.client = await access.getEsaClient()
  }


  async getSiteItem(domain: string) {
    const ret = await this.client.doRequest({
      // 接口名称
      action: "ListSites",
      // 接口版本
      version: "2024-09-10",
      // 接口协议
      protocol: "HTTPS",
      // 接口 HTTP 方法
      method: "GET",
      authType: "AK",
      style: "RPC",
      data: {
        query: {
          SiteName: domain,
          // ["SiteSearchType"] = "exact";
          SiteSearchType: "exact",
          AccessType: "NS"
        }
      }
    })
    const list = ret.Sites
    if (list?.length === 0) {
      throw new Error(`阿里云ESA中不存在此域名站点:${domain}，请确认域名已添加到ESA中，且为NS接入方式`);
    }
    return list[0]

  }

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, domain);


    const siteItem = await this.getSiteItem(domain)
    const siteId = siteItem.SiteId


    const res = await this.client.doRequest({
      action: "CreateRecord",
      version: "2024-09-10",
      method: "POST",
      data: {
        query: {
          SiteId: siteId,
          RecordName: fullRecord,
          Type: type,
          //     queries["Ttl"] = 1231311;
          Ttl: 100,
          Data: JSON.stringify({ Value: value }),
        }
      }
    })

    this.logger.info('添加域名解析成功:', fullRecord, value, res.RecordId);
    return {
      RecordId: res.RecordId,
      SiteId: siteId,
    }

  }

  async removeRecord(options: RemoveRecordOptions<any>): Promise<any> {
    const record = options.recordRes;

    await this.client.doRequest({
      action: "DeleteRecord",
      version: "2024-09-10",
      data: {
       query: {
         RecordId: record.RecordId,
       }
      }
    })
    this.logger.info('删除域名解析成功:', record.RecordId);
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    return await this.ctx.access.getDomainListPage(req)
  }
}

new AliesaDnsProvider();
