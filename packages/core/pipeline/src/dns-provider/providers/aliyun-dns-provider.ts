import { AbstractDnsProvider } from "../abstract-dns-provider";
import Core from "@alicloud/pop-core";
import _ from "lodash";
import { CreateRecordOptions, IDnsProvider, IsDnsProvider, RemoveRecordOptions } from "../api";

@IsDnsProvider({
  name: "aliyun",
  title: "阿里云",
  desc: "阿里云DNS解析提供商",
  accessType: "aliyun",
})
export class AliyunDnsProvider extends AbstractDnsProvider implements IDnsProvider {
  client: any;
  constructor() {
    super();
  }
  async onInit() {
    const access: any = this.access;
    this.client = new Core({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      endpoint: "https://alidns.aliyuncs.com",
      apiVersion: "2015-01-09",
    });
  }

  async getDomainList() {
    const params = {
      RegionId: "cn-hangzhou",
    };

    const requestOption = {
      method: "POST",
    };

    const ret = await this.client.request("DescribeDomains", params, requestOption);
    return ret.Domains.Domain;
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
