import { PageRes, PageSearch } from "@certd/pipeline";
import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { NamesiloAccess } from "./access.js";

export type NamesiloRecord = {
  record_id: string;
};

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: "namesilo",
  title: "namesilo",
  desc: "namesilo dns provider",
  icon: "simple-icons:namesilo",
  // 这里是对应的 cloudflare的access类型名称
  accessType: "namesilo",
})
export class NamesiloDnsProvider extends AbstractDnsProvider<NamesiloRecord> {
  access!: NamesiloAccess;
  async onInstance() {
    //一些初始化的操作
    // 也可以通过ctx成员变量传递context
    this.access = this.ctx.access as NamesiloAccess;
  }
  usePunyCode(): boolean {
    //是否使用punycode来添加解析记录
    //默认都使用原始中文域名来添加
    return true;
  }

  /**
   * 创建dns解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<NamesiloRecord> {
    /**
     * fullRecord: '_acme-challenge.test.example.com',
     * value: 一串uuid
     * type: 'TXT',
     * domain: 'example.com'
     */
    const { fullRecord, hostRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value, type, domain);

    //domain=namesilo.com&rrtype=A&rrhost=test&rrvalue=55.55.55.55&rrttl=7207
    const record: any = await this.access.doRequest("/api/dnsAddRecord", {
      domain,
      rrtype: type,
      rrhost: hostRecord,
      rrvalue: value,
      rrttl: 3600,
    });

    //本接口需要返回本次创建的dns解析记录，这个记录会在删除的时候用到
    return record;
  }

  /**
   *  删除dns解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<NamesiloRecord>): Promise<void> {
    const { fullRecord, value } = options.recordReq;
    const record = options.recordRes;
    this.logger.info("删除域名解析：", fullRecord, value);
    if (!record && !record.record_id) {
      this.logger.info("record为空，不执行删除");
      return;
    }
    //这里调用删除txt dns解析记录接口

    const recordId = record.record_id;
    await this.access.doRequest("/api/dnsDeleteRecord", {
      domain: options.recordReq.domain,
      rrid: recordId,
    });
    this.logger.info(`删除域名解析成功:fullRecord=${fullRecord},value=${value}`);
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    return await this.access.getDomainListPage(req);
  }
}

//实例化这个provider，将其自动注册到系统中
new NamesiloDnsProvider();
