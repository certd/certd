import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";

import { VolcengineDnsClient } from "./dns-client.js";
import { VolcengineAccess } from "./access.js";
import { PageSearch } from "@certd/pipeline";

@IsDnsProvider({
  name: "volcengine",
  title: "火山引擎",
  desc: "火山引擎DNS解析提供商",
  accessType: "volcengine",
  icon: "svg:icon-volcengine",
  order:2,
})
export class VolcengineDnsProvider extends AbstractDnsProvider {
  client: VolcengineDnsClient;
  access!: VolcengineAccess;


  async onInstance() {
    this.access = this.ctx.access as VolcengineAccess
    this.client = new VolcengineDnsClient({
      access: this.access,
      logger: this.logger,
      http: this.http
    });
  }

  /**
   * @param domain
   */
  async getDomain(domain: string) {
    const res = await this.client.findDomain(domain)

    if (res.Result.Zones && res.Result.Zones.length > 0) {
      return res.Result.Zones[0];
    }
    throw new Error(`域名${domain}不存在`);
  }


  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, hostRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value, domain);

    const domainInfo = await this.getDomain(domain);
    const ZID = domainInfo.ZID;

    const body = {
      ZID,
      "Host": hostRecord,
      "Type": type,
      "Value": value
    };

    const res = await this.client.doRequest({
      method: "POST",
      service: "dns",
      region: "cn-beijing",
      query: {
        Action: "CreateRecord",
        Version: "2018-08-01"
      },
      body
    });

    return {
      RecordID: res.Result.RecordID,
      ZID: ZID
    };
  }


  async removeRecord(options: RemoveRecordOptions<any>): Promise<any> {
    const record = options.recordRes;

    const body = {
      RecordID: record.RecordID
    };

    await this.client.doRequest({
      method: "POST",
      service: "dns",
      region: "cn-beijing",
      query: {
        Action: "DeleteRecord",
        Version: "2018-08-01"
      },
      body
    });
  }
  
  async getDomainListPage(page: PageSearch) {
    return await this.client.getDomainList(page)
  }
}

new VolcengineDnsProvider();
