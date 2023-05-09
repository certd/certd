import _ from "lodash";
import { CreateRecordOptions, IDnsProvider, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { Autowire, ILogger } from "@certd/pipeline";
import { HuaweiAccess } from "../access";
import { HuaweiYunClient } from "../lib/client";

@IsDnsProvider({
  name: "huawei",
  title: "华为云",
  desc: "华为云DNS解析提供商",
  accessType: "huawei",
})
export class HuaweiDnsProvider implements IDnsProvider {
  client: any;
  @Autowire()
  access!: HuaweiAccess;
  @Autowire()
  logger!: ILogger;
  endpoint = "https://domains-external.myhuaweicloud.com";
  async onInit() {
    const access: any = this.access;
    this.client = new HuaweiYunClient(access);
  }

  async getDomainList() {
    const url = `${this.endpoint}/v2/domains`;
    const ret = await this.client.request({
      url,
      method: "GET",
    });
    return ret.domains;
  }

  async matchDomain(dnsRecord: string) {
    const list = await this.getDomainList();
    let domain = null;
    for (const item of list) {
      if (_.endsWith(dnsRecord, item.DomainName)) {
        domain = item.DomainName;
        break;
      }
    }
    if (!domain) {
      throw new Error("can not find Domain ," + dnsRecord);
    }
    return domain;
  }

  async getRecords(domain: string, rr: string, value: string) {
    const params: any = {
      RegionId: "cn-hangzhou",
      DomainName: domain,
      RRKeyWord: rr,
      ValueKeyWord: undefined,
    };
    if (value) {
      params.ValueKeyWord = value;
    }

    const requestOption = {
      method: "POST",
    };

    const ret = await this.client.request("DescribeDomainRecords", params, requestOption);
    return ret.DomainRecords.Record;
  }

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type } = options;
    this.logger.info("添加域名解析：", fullRecord, value);
    const domain = await this.matchDomain(fullRecord);
    const rr = fullRecord.replace("." + domain, "");

    const params = {
      RegionId: "cn-hangzhou",
      DomainName: domain,
      RR: rr,
      Type: type,
      Value: value,
      // Line: 'oversea' // 海外
    };

    const requestOption = {
      method: "POST",
    };

    try {
      const ret = await this.client.request("AddDomainRecord", params, requestOption);
      this.logger.info("添加域名解析成功:", value, value, ret.RecordId);
      return ret.RecordId;
    } catch (e: any) {
      if (e.code === "DomainRecordDuplicate") {
        return;
      }
      this.logger.info("添加域名解析出错", e);
      throw e;
    }
  }
  async removeRecord(options: RemoveRecordOptions): Promise<any> {
    const { fullRecord, value, record } = options;
    const params = {
      RegionId: "cn-hangzhou",
      RecordId: record,
    };

    const requestOption = {
      method: "POST",
    };

    const ret = await this.client.request("DeleteDomainRecord", params, requestOption);
    this.logger.info("删除域名解析成功:", fullRecord, value, ret.RecordId);
    return ret.RecordId;
  }
}
