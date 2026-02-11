import { PageRes, PageSearch } from "@certd/pipeline";
import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { XinnetConnectAccess } from "./access.js";


export type XinnetConnectRecord = {
  domain: string;
  hostRecord: string;
  type: string;
  value: string;
};

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: 'xinnetconnect',
  title: '新网互联',
  desc: '新网互联',
  icon: 'svg:icon-xinnet',
  // 这里是对应的 cloudflare的access类型名称
  accessType: 'xinnetconnect',
  order:999,
})
export class XinnetConnectDnsProvider extends AbstractDnsProvider<XinnetConnectRecord> {
  access!: XinnetConnectAccess;

  async onInstance() {
    //一些初始化的操作
    // 也可以通过ctx成员变量传递context
    this.access = this.ctx.access as XinnetConnectAccess;
   
  }

  /**
   * 创建dns解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<XinnetConnectRecord> {
    const { fullRecord,hostRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, type, domain);

    const recordReq = {
      domain: domain,
      type: 'TXT',
      hostRecord: hostRecord,
      value: value,
    }
    await this.access.addDnsRecord(recordReq)
    return recordReq;
  }


  /**
   *  删除dns解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<XinnetConnectRecord>): Promise<void> {
    const { fullRecord, value } = options.recordReq;
    const record = options.recordRes;
    this.logger.info('删除域名解析：', fullRecord, value);
    if (!record) {
      this.logger.info('record为空，不执行删除');
      return;
    }
    await this.access.delDnsRecord(record)
    this.logger.info(`删除域名解析成功:fullRecord=${fullRecord}`);
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const res = await this.access.getDomainList(req)
    let list = res.domainlist || []
    list = list.map(item => ({
      domain: item.domain,
      id: item.domain,
    }))
    return {
      pageNo: req.pageNo,
      pageSize: req.pageSize,
      total: res.total || 0,
      list,
    }
  }
}

//实例化这个provider，将其自动注册到系统中
new XinnetConnectDnsProvider();
