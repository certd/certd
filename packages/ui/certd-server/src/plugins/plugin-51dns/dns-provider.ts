import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";

import { Dns51Access } from "./access.js";
import { Dns51Client } from "./client.js";
import { Pager, PageRes } from "@certd/pipeline";

export type Dns51Record = {
  id: number;
  domainId: number,
};

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: '51dns',
  title: '51dns',
  desc: '51DNS',
  icon: 'arcticons:dns-changer-3',
  // 这里是对应的 cloudflare的access类型名称
  accessType: '51dns',
  order:999,
})
export class Dns51DnsProvider extends AbstractDnsProvider<Dns51Record> {
  access!: Dns51Access;

  client!:Dns51Client;
  async onInstance() {
    //一些初始化的操作
    // 也可以通过ctx成员变量传递context
    this.access = this.ctx.access as Dns51Access;
    this.client = new Dns51Client({
      logger: this.logger,
      access: this.access,
    });
  }

  /**
   * 创建dns解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<Dns51Record> {
    /**
     * fullRecord: '_acme-challenge.test.example.com',
     * value: 一串uuid
     * type: 'TXT',
     * domain: 'example.com'
     */
    const { fullRecord,hostRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, type, domain);




    const domainId = await this.client.getDomainId(domain);
    this.logger.info('获取domainId成功:', domainId);

    const res = await this.client.createRecord({
      domain: domain,
      domainId: domainId,
      type: 'TXT',
      host: hostRecord,
      data: value,
      ttl: 300,
    })
    return {
      id: res.id,
      domainId: domainId,
    };
  }


  /**
   *  删除dns解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<Dns51Record>): Promise<void> {
    const { fullRecord, value } = options.recordReq;
    const record = options.recordRes;
    this.logger.info('删除域名解析：', fullRecord, value);
    if (!record) {
      this.logger.info('record为空，不执行删除');
      return;
    }
    //这里调用删除txt dns解析记录接口
    /**
     * 请求示例
     * DELETE /api/record?id=85371689655342080 HTTP/1.1
     * Authorization: Basic {token}
     * 请求参数
     */
    const {id,domainId} = record
    await this.client.deleteRecord({
      id,
      domainId
    })
    this.logger.info(`删除域名解析成功:fullRecord=${fullRecord},id=${id}`);
  }

  async getDomainListPage(pager: Pager): Promise<PageRes<DomainRecord>> {
    return await this.client.getDomainListPage(pager)
  }
}

//实例化这个provider，将其自动注册到系统中
new Dns51DnsProvider();
