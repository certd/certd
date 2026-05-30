import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";

import { PageRes, PageSearch } from "@certd/pipeline";
import { DnslaAccess } from "./access.js";

export type DnslaRecord = {
  id: string;
};

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: "dnsla",
  title: "dns.la",
  desc: "dns.la",
  icon: "arcticons:dns-changer-3",
  // 这里是对应的 cloudflare的access类型名称
  accessType: "dnsla",
})
export class DnslaDnsProvider extends AbstractDnsProvider<DnslaRecord> {
  access!: DnslaAccess;
  async onInstance() {
    //一些初始化的操作
    // 通过ctx成员变量传递context
    this.access = this.ctx.access as DnslaAccess;
  }

  async getDomainDetail(domain: string) {
    /**
     * 请求示例
     * GET /api/domain?id=85371689655342080&domain=test.com HTTP/1.1
     * Authorization: Basic {token}
     * 请求参数
     * 参数	名称	类型	必选
     * id	域名id	string	id、domain 二选一
     * domain	域名	string	id、domain 二选一
     * Response
     * 响应示例
     * {
     *     "code": 200,
     *     "msg": "",
     *     "data": {
     *         "id": "85371689655342080",
     *         "createdAt": 1692856597,
     *         "updatedAt": 1692856598,
     *         "userId": "85068081529119744",
     *         "userAccount": "foo@foo.com",
     *         "assetId": "",
     *         "groupId": "",
     */

    const url = `/api/domain?domain=${domain}`;
    const res = await this.access.doRequestApi(url, null, "get");
    return res.data;
  }

  /**
   * 创建dns解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<DnslaRecord> {
    /**
     * fullRecord: '_acme-challenge.test.example.com',
     * value: 一串uuid
     * type: 'TXT',
     * domain: 'example.com'
     */
    const { fullRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value, type, domain);

    const domainDetail = await this.getDomainDetail(domain);
    const domainId = domainDetail.id;
    this.logger.info("获取domainId成功:", domainId);

    // 给domain下创建txt类型的dns解析记录，fullRecord
    /**
     * POST /api/record HTTP/1.1
     * Authorization: Basic {token}
     * Content-Type: application/json; charset=utf-8
     *
     * {
     *     "domainId": "85369994254488576",
     *     "type": 1,
     *     "host": "www",
     *     "data": "1.1.1.1",
     *     "ttl": 600,
     *     "groupId": "",
     *     "lineId": "",
     *     "preference": 10,
     *     "weight": 1,
     *     "dominant": false
     * }
     */
    const url = `/api/record`;
    /**
     * A	1
     * NS	2
     * CNAME	5
     * MX	15
     * TXT	16
     * AAAA	28
     * SRV	33
     * CAA	257
     * URL转发	256
     */
    const res = await this.access.doRequestApi(url, {
      domainId: domainId,
      type: 16,
      host: fullRecord.replace(`.${domain}`, ""),
      data: value,
      ttl: 60,
    });

    return res.data;
  }

  /**
   *  删除dns解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<DnslaRecord>): Promise<void> {
    const { fullRecord, value } = options.recordReq;
    const record = options.recordRes;
    this.logger.info("删除域名解析：", fullRecord, value);
    if (!record) {
      this.logger.info("record为空，不执行删除");
      return;
    }
    //这里调用删除txt dns解析记录接口
    /**
     * 请求示例
     * DELETE /api/record?id=85371689655342080 HTTP/1.1
     * Authorization: Basic {token}
     * 请求参数
     */
    const recordId = record.id;
    const url = `/api/record?id=${recordId}`;
    await this.access.doRequestApi(url, null, "delete");
    this.logger.info(`删除域名解析成功:fullRecord=${fullRecord},value=${value}`);
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    return await this.access.getDomainListPage(req);
  }
}

//实例化这个provider，将其自动注册到系统中
new DnslaDnsProvider();
