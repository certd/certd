import { PageRes, PageSearch } from "@certd/pipeline";
import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { DynadotAccess } from "./access.js";

export type DynadotRecord = {
  sub_host: string;
  record_type: string;
  record_value1: string;
};

type SubRecordItem = DynadotRecord & { record_value2: string };
type MainRecordItem = { record_type: string; record_value1: string; record_value2: string };

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
      const subRecords = [
        {
          sub_host: hostRecord,
          record_type: type.toLowerCase(),
          record_value1: value,
          record_value2: "",
        }
      ]

      await this.postRecords(domain, {subRecords, mainRecords: [], addToCurrent: true});

      this.logger.info("添加域名解析成功：", fullRecord, value);
      return {
        sub_host: hostRecord,
        record_type: type.toLowerCase(),
        record_value1: value,
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

    if (!record || !record.sub_host) {
      this.logger.info("record为空，不执行删除");
      return;
    }

    const existingRecords = await this.getDnsRecords(domain);

    const beforeCount = existingRecords.subRecords.length;
    existingRecords.subRecords = existingRecords.subRecords.filter(item => !(item.sub_host === record.sub_host && item.record_type === record.record_type && item.record_value1 === record.record_value1));

    if (beforeCount === existingRecords.subRecords.length) {
      this.logger.info("未找到要删除的DNS记录，可能已被移除或不存在:", fullRecord);
      return;
    }

    if (existingRecords.mainRecords.length == 0) {
      existingRecords.mainRecords = [
        {
          record_type: "txt",
          record_value1: "init_txt_by_certd",
          record_value2: "",
        }
      ]
    }

    await this.postRecords(domain, {
      ...existingRecords,
      addToCurrent: false,
    });

    this.logger.info("删除域名解析成功:", fullRecord, value);
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    return await this.access.getDomainListPage(req);
  }

  private async getDnsRecords(domain: string): Promise<{
    mainRecords: MainRecordItem[];
    subRecords: SubRecordItem[];
  }> {
    let res: any;
    try {
      res = await this.access.doRequest({
        method: "GET",
        path: `/restful/v2/domains/${domain}/records`,
      });
    } catch (e: any) {
      this.logger.info("获取DNS记录失败，域名可能尚未配置DNS记录，将视为空记录:");
      return { mainRecords: [], subRecords: [] };
    }

    const glueInfo = res.data?.glue_info || {};

    const subRecords: SubRecordItem[] = (glueInfo.dns_sub_list || [])
      .filter((item: any) => item.sub_host && item.record_value1)
      .map((item: any) => ({
        sub_host: item.sub_host || "",
        record_type: item.record_type || "",
        record_value1: item.record_value1 || "",
        record_value2: item.record_value2 || "",
      }));

    const mainRecords: MainRecordItem[] = (glueInfo.dns_main_list || [])
      .filter((item: any) => item.record_value1)
      .map((item: any) => ({
        record_type: item.record_type || "",
        record_value1: String(item.record_value1),
        record_value2: String(item.record_value2 || ""),
      }));

    return { mainRecords, subRecords };
  }

  private async postRecords(domain: string, records: { mainRecords: MainRecordItem[]; subRecords: SubRecordItem[] ,addToCurrent: boolean}): Promise<void> {
    await this.access.doRequest({
      method: "POST",
      path: `/restful/v2/domains/${domain}/records`,
      data: {
        dns_main_list: records.mainRecords,
        dns_sub_list: records.subRecords,
        ttl: 300,
        add_dns_to_current_setting: records.addToCurrent || false,
      },
    });
  }
}

new DynadotDnsProvider();
