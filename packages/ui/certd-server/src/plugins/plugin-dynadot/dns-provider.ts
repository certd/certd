import { PageRes, PageSearch } from "@certd/pipeline";
import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { DynadotAccess } from "./access.js";

export type DynadotRecord = {
  subdomain: string;
  sub_record_type: string;
  sub_record: string;
};

@IsDnsProvider({
  name: "dynadot",
  title: "Dynadot",
  desc: "Dynadot DNS提供商",
  icon: "simple-icons:dynatrace",
  accessType: "dynadot",
})
export class DynadotDnsProvider extends AbstractDnsProvider<DynadotRecord> {
  access!: DynadotAccess;

  async onInstance() {
    this.access = this.ctx.access as DynadotAccess;
  }

  async createRecord(options: CreateRecordOptions): Promise<DynadotRecord> {
    const { fullRecord, hostRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value, type, domain);

    try {
      const existingRecords = await this.getDnsRecords(domain);
      const subdomainIndex = existingRecords.subRecords.length;

      const setParams: any = {
        command: "set_dns2",
        domain,
        key: this.access.apiKey,
      };

      for (let i = 0; i < existingRecords.mainRecords.length; i++) {
        const rec = existingRecords.mainRecords[i];
        setParams[`main_record_type${i}`] = rec.type;
        setParams[`main_record${i}`] = rec.value;
        setParams[`main_recordx${i}`] = rec.extra || "";
      }

      for (let i = 0; i < existingRecords.subRecords.length; i++) {
        const rec = existingRecords.subRecords[i];
        setParams[`subdomain${i}`] = rec.subdomain;
        setParams[`sub_record_type${i}`] = rec.type;
        setParams[`sub_record${i}`] = rec.value;
        setParams[`sub_recordx${i}`] = rec.extra || "";
      }

      setParams[`subdomain${subdomainIndex}`] = hostRecord;
      setParams[`sub_record_type${subdomainIndex}`] = type;
      setParams[`sub_record${subdomainIndex}`] = value;
      setParams[`sub_recordx${subdomainIndex}`] = "";
      setParams.ttl = 600;

      await this.access.doRequest(setParams);

      this.logger.info("添加域名解析成功：", fullRecord, value);
      return {
        subdomain: hostRecord,
        sub_record_type: type,
        sub_record: value,
      };
    } catch (error) {
      this.logger.error("创建DNS记录失败:", error);
      throw new Error(`创建DNS记录失败: ${(error as Error).message}`);
    }
  }

  async removeRecord(options: RemoveRecordOptions<DynadotRecord>): Promise<void> {
    const { fullRecord, value, domain } = options.recordReq;
    const record = options.recordRes;
    this.logger.info("删除域名解析：", fullRecord, value);

    try {
      if (!record || !record.subdomain) {
        this.logger.info("record为空，不执行删除");
        return;
      }

      const existingRecords = await this.getDnsRecords(domain);

      const setParams: any = {
        command: "set_dns2",
        domain,
        key: this.access.apiKey,
      };

      for (let i = 0; i < existingRecords.mainRecords.length; i++) {
        const rec = existingRecords.mainRecords[i];
        setParams[`main_record_type${i}`] = rec.type;
        setParams[`main_record${i}`] = rec.value;
        setParams[`main_recordx${i}`] = rec.extra || "";
      }

      let newIndex = 0;
      for (let i = 0; i < existingRecords.subRecords.length; i++) {
        const rec = existingRecords.subRecords[i];
        if (rec.subdomain === record.subdomain && rec.type === record.sub_record_type && rec.value === record.sub_record) {
          continue;
        }
        setParams[`subdomain${newIndex}`] = rec.subdomain;
        setParams[`sub_record_type${newIndex}`] = rec.type;
        setParams[`sub_record${newIndex}`] = rec.value;
        setParams[`sub_recordx${newIndex}`] = rec.extra || "";
        newIndex++;
      }
      setParams.ttl = 600;

      await this.access.doRequest(setParams);

      this.logger.info("删除域名解析成功:", fullRecord, value);
    } catch (error) {
      this.logger.error("删除DNS记录失败:", error);
    }
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    return await this.access.getDomainListPage(req);
  }

  private async getDnsRecords(domain: string): Promise<{
    mainRecords: Array<{ type: string; value: string; extra: string }>;
    subRecords: Array<{ subdomain: string; type: string; value: string; extra: string }>;
  }> {
    const res = await this.access.doRequest({
      command: "get_dns",
      domain,
    });

    const dnsContent = res.GetDnsResponse?.DnsContent || res.GetDnsResponse?.dnsContent || {};

    const mainRecords: Array<{ type: string; value: string; extra: string }> = [];
    const subRecords: Array<{ subdomain: string; type: string; value: string; extra: string }> = [];

    const MAX_MAIN = 20;
    const MAX_SUB = 100;

    for (let i = 0; i < MAX_MAIN; i++) {
      const type = dnsContent[`MainRecordType${i}`];
      const value = dnsContent[`MainRecord${i}`];
      if (value !== undefined && value !== null && value !== "") {
        mainRecords.push({
          type: type || "",
          value: String(value),
          extra: String(dnsContent[`MainRecordX${i}`] || ""),
        });
      }
    }

    for (let i = 0; i < MAX_SUB; i++) {
      const subdomain = dnsContent[`SubDomain${i}`];
      const type = dnsContent[`SubRecordType${i}`];
      const value = dnsContent[`SubRecord${i}`];
      if (value !== undefined && value !== null && value !== "" && subdomain !== undefined && subdomain !== null && subdomain !== "") {
        subRecords.push({
          subdomain: String(subdomain),
          type: type || "",
          value: String(value),
          extra: String(dnsContent[`SubRecordX${i}`] || ""),
        });
      }
    }

    return { mainRecords, subRecords };
  }
}

new DynadotDnsProvider();
