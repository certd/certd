import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";

import { GodaddyAccess } from "./access.js";
import { Pager, PageRes, PageSearch } from "@certd/pipeline";

export type GodaddyRecord = {
  domain: string,
  type: string,
  name: string,
  data: string,
};

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: 'godaddy',
  title: 'godaddy',
  desc: 'GoDaddy',
  icon: 'simple-icons:godaddy',
  // 这里是对应的 cloudflare的access类型名称
  accessType: 'godaddy',
  order:10,
})
export class GodaddyDnsProvider extends AbstractDnsProvider<GodaddyRecord> {
  access!: GodaddyAccess;
  async onInstance() {
    //一些初始化的操作
    // 也可以通过ctx成员变量传递context
    this.access = this.ctx.access as GodaddyAccess;
  }

  /**
   * 创建dns解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<GodaddyRecord> {
    /**
     * fullRecord: '_acme-challenge.test.example.com',
     * value: 一串uuid
     * type: 'TXT',
     * domain: 'example.com'
     * hostRecord: _acme-challenge.test
     */
    const { fullRecord,hostRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, type, domain);


    const res = await this.access.doRequest({
      method: 'PATCH',
      url: '/v1/domains/'+domain+'/records',
      data: [
        {
          type: 'TXT',
          name: hostRecord,
          data: value,
          ttl: 600,
        }
      ]
    })
    this.logger.info('添加域名解析成功：', res);
    return {
      domain: domain,
      type: 'TXT',
      name: hostRecord,
      data: value,
    };
  }


  /**
   *  删除dns解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<GodaddyRecord>): Promise<void> {
    const { fullRecord, value } = options.recordReq;
    const record = options.recordRes;
    this.logger.info('删除域名解析：', fullRecord, value);
    if (!record) {
      this.logger.info('record为空，不执行删除');
      return;
    }
    //这里调用删除txt dns解析记录接口
    const {name,type,domain} = record
    const res = await this.access.doRequest({
      method: 'DELETE',
      url: '/v1/domains/'+domain+`/records/${type}/${name}`,
    })
    this.logger.info(`删除域名解析成功:fullRecord=${fullRecord},id=${res}`);
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const pager = new Pager(req);
    
    const ret = await this.access.getDomainList(req)

    let list = ret.zones || []
    list = list.map((item: any) => ({
      id: item.domainId,
      domain: item.domain,
    }));
    const total = list.length === pager.pageSize ?  list.length+1: list.length
    return {
      total,
      list,
    };
  }
}

//实例化这个provider，将其自动注册到系统中
new GodaddyDnsProvider();
