import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { DnsmgrAccess } from "./access.js";
import { PageRes, PageSearch } from "@certd/pipeline";

type DnsmgrRecord = {
  domainId: string;
  name: string;
  value: string;
};

@IsDnsProvider({
  name: "dnsmgr",
  title: "彩虹DNS",
  desc: "彩虹DNS管理系统",
  icon: "clarity:plugin-line",
  accessType: "dnsmgr",
  order: 99,
})
export class DnsmgrDnsProvider extends AbstractDnsProvider<DnsmgrRecord> {
  access!: DnsmgrAccess;

  async onInstance() {
    this.access = this.ctx.access as DnsmgrAccess;
    this.logger.debug("access", this.access);
  }

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value, type, domain);

    const domainList = await this.access.GetDomainList({ searchKey: domain });
    const domainInfo = domainList.list?.find((item: any) => item.name === domain);

    if (!domainInfo) {
      throw new Error(`未找到域名：${domain}`);
    }

    const name = fullRecord.replace(`.${domain}`, "");
    const res = await this.access.createDnsRecord(domainInfo.id, fullRecord, value, type, domain);
    return { domainId: domainInfo.id, name, value, res };
  }

  async removeRecord(options: RemoveRecordOptions<DnsmgrRecord>): Promise<void> {
    const { fullRecord, value } = options.recordReq;
    const record = options.recordRes;
    this.logger.info("删除域名解析：", fullRecord, value, record);

    if (record && record.domainId) {
      const records = await this.access.getDnsRecords(record.domainId, "TXT", record.name, record.value);
      if (records && records.rows && records.rows.length > 0) {
        const recordToDelete = records.rows[0];
        await this.access.deleteDnsRecord(record.domainId, recordToDelete.RecordId);
      }
    }

    this.logger.info("删除域名解析成功:", fullRecord, value);
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const res = await this.access.GetDomainList(req);
    res.list = res.list?.map((item: any) => {
      return {
        id: item.id,
        domain: item.name,
      };
    });
    return res;
  }
}

new DnsmgrDnsProvider();
