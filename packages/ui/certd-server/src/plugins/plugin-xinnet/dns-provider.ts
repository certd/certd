import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { XinnetAccess } from "./access.js";
import { XinnetClient } from "@certd/plugin-plus";
import { PageRes, PageSearch } from "@certd/pipeline";

export type XinnetRecord = {
  recordId: number;
  recordFullName: string;
  recordValue: string;
  type: string;
  serviceCode: string;
  dcpCookie: string;
};

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: "xinnet",
  title: "新网",
  desc: "新网域名解析",
  icon: "svg:icon-xinnet",
  // 这里是对应的 cloudflare的access类型名称
  accessType: "xinnet",
  order: 7,
})
export class XinnetProvider extends AbstractDnsProvider<XinnetRecord> {
  access!: XinnetAccess;

  async onInstance() {
    //一些初始化的操作
    // 也可以通过ctx成员变量传递context
    this.access = this.ctx.access as XinnetAccess;
  }

  /**
   * 创建dns解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<XinnetRecord> {
    /**
     * fullRecord: '_acme-challenge.test.example.com',
     * value: 一串uuid
     * type: 'TXT',
     * domain: 'example.com'
     */
    const { fullRecord, hostRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value, type, domain);

    const client = new XinnetClient({
      logger: this.logger,
      access: this.access,
      http: this.http,
    });

    const res = await client.getDomainList({
      searchKey: domain,
    });

    if (!res.list || res.list.length == 0) {
      throw new Error("域名不存在");
    }

    const list = res.list.map(item => ({
      domainName: item.domainName,
      serviceCode: item.serviceCode,
    }));
    this.logger.info("域名列表:", JSON.stringify(list));

    const domainItem = list.find(item => item.domainName === domain);
    if (!domainItem) {
      throw new Error("域名（" + domain + "）不存在");
    }

    const serviceCode = domainItem.serviceCode;

    const dcpCookie = await client.getDcpCookie({
      serviceCode,
    });

    const recordRes = await client.addDomainDnsRecord(
      {
        recordName: hostRecord,
        type: type,
        recordValue: value,
      },
      {
        dcpCookie,
        serviceCode,
      }
    );
    return {
      ...recordRes,
      serviceCode,
      dcpCookie,
    };
  }

  /**
   *  删除dns解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<XinnetRecord>): Promise<void> {
    const client = new XinnetClient({
      logger: this.logger,
      access: this.access,
      http: this.http,
    });

    const recordRes = options.recordRes;
    let dcpCookie = recordRes.dcpCookie;
    if (!dcpCookie) {
      dcpCookie = await client.getDcpCookie({
        serviceCode: recordRes.serviceCode,
      });
    }

    await client.deleteDomainDnsRecord(recordRes, {
      dcpCookie,
      serviceCode: recordRes.serviceCode,
    });
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const client = new XinnetClient({
      logger: this.logger,
      access: this.access,
      http: this.http,
    });

    const res = await client.getDomainList(req);

    const list = res.list.map(item => ({
      domain: item.domainName,
      id: item.domainName,
    }));
    return {
      list: list || [],
      total: res.totalRows || 0,
    };
  }
}

//实例化这个provider，将其自动注册到系统中
new XinnetProvider();
