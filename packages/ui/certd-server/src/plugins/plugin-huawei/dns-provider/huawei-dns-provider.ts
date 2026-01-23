import * as _ from "lodash-es";
import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";

import { HuaweiAccess } from "../access/index.js";
import { ApiRequestOptions, HuaweiYunClient } from "@certd/lib-huawei";
import { Pager, PageRes, PageSearch } from "@certd/pipeline";

export type SearchRecordOptions = {
  zoneId: string;
} & CreateRecordOptions;

@IsDnsProvider({
  name: "huawei",
  title: "华为云",
  desc: "华为云DNS解析提供商",
  accessType: "huawei",
  icon: "svg:icon-huawei"
})
export class HuaweiDnsProvider extends AbstractDnsProvider {
  client!: HuaweiYunClient;
  access!: HuaweiAccess;
  domainEndpoint = "https://domains-external.myhuaweicloud.com";
  dnsEndpoint = "https://dns.cn-south-1.myhuaweicloud.com";

  async onInstance() {
    this.access = this.ctx.access as HuaweiAccess
    const access: any = this.access;
    this.client = new HuaweiYunClient(access, this.logger);
  }

  async getDomainList() {
    const url = `${this.dnsEndpoint}/v2/zones`;
    const ret = await this.client.request({
      url,
      method: "GET"
    });
    return ret.zones;
  }

  async matchDomain(dnsRecord: string) {
    const zoneList = await this.getDomainList();
    let zoneRecord = null;
    for (const item of zoneList) {
      if (_.endsWith(dnsRecord + ".", item.name)) {
        zoneRecord = item;
        break;
      }
    }
    if (!zoneRecord) {
      throw new Error("can not find Domain ," + dnsRecord);
    }
    return zoneRecord;
  }

  async searchRecord(options: SearchRecordOptions): Promise<any> {
    const req: ApiRequestOptions = {
      url: `${this.dnsEndpoint}/v2/zones/${options.zoneId}/recordsets?search_mode=equal&name=${options.fullRecord}.&type=${options.type}`,
      method: "GET"
    };
    const ret = await this.client.request(req);
    return ret.recordsets;
  }

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type } = options;
    this.logger.info("添加域名解析：", fullRecord, value);
    this.logger.info("查询是否有重复记录");
    const zoneRecord = await this.matchDomain(fullRecord);
    const zoneId = zoneRecord.id;

    const records: any = await this.searchRecord({
      zoneId,
      ...options
    });
    this.logger.info(`查询${options.type}数量:${records.length}`);
    let found = null;
    const hwRecordValue = `"${value}"`;
    if (records && records.length > 0) {
      found = records[0];
      this.logger.info(`记录:${found.id},${found.records}`);
      if (found.records.includes(hwRecordValue)) {
        // this.logger.info(`删除重复记录:${record.id}`)
        // await this.removeRecord({
        //   recordRes: record,
        //   recordReq: options,
        // });
        this.logger.info(`无需重复添加:${found.records}`);
        return found;
      }
    }

    if (found) {
      //修改
      const req: ApiRequestOptions = {
        url: `${this.dnsEndpoint}/v2/zones/${zoneId}/recordsets/${found.id}`,
        method: "PUT",
        data: {
          name: fullRecord + ".",
          type,
          records: [hwRecordValue, ...found.records]
        }
      };
      const ret = await this.client.request(req);
      this.logger.info("添加域名解析成功:", value, ret);
      return ret;
    } else {
      //创建
      try {
        const req: ApiRequestOptions = {
          url: `${this.dnsEndpoint}/v2/zones/${zoneId}/recordsets`,
          method: "POST",
          data: {
            name: fullRecord + ".",
            type,
            records: [hwRecordValue]
          }
        };
        const ret = await this.client.request(req);
        this.logger.info("添加域名解析成功:", value, ret);
        return ret;
      } catch (e: any) {
        if (e.code === "DNS.0312") {
          return;
        }
        this.logger.info("添加域名解析出错", e);
        throw e;
      }
    }
  }

  async removeRecord(options: RemoveRecordOptions<any>): Promise<any> {
    const { fullRecord, value } = options.recordReq;
    const record = options.recordRes;
    if (!record) {
      this.logger.info("解析记录recordId为空，不执行删除", fullRecord, value);
      return;
    }
    const zoneId = record.zone_id;

    //查询原来的记录
    const records: any = await this.searchRecord({
      zoneId,
      ...options.recordReq
    });
    const hwRecordValue = `"${value}"`;

    if (records && records.length > 0) {
      //找到记录
      const found = records[0];
      if (found.records.includes(hwRecordValue)) {
        if (found.records.length > 1) {
          //修改

          const req: ApiRequestOptions = {
            url: `${this.dnsEndpoint}/v2/zones/${zoneId}/recordsets/${found.id}`,
            method: "PUT",
            data: {
              name: fullRecord + ".",
              type: found.type,
              records: found.records.filter((item: string) => item !== hwRecordValue)
            }
          };
          const ret = await this.client.request(req);
          this.logger.info("修改域名解析成功[put]:", value, ret);
        } else {
          //删除
          const req: ApiRequestOptions = {
            url: `${this.dnsEndpoint}/v2/zones/${zoneId}/recordsets/${found.id}`,
            method: "DELETE"
          };
          const ret = await this.client.request(req);
          this.logger.info("删除域名解析成功[delete]:", fullRecord, value, ret.RecordId);
        }
      }else{
        this.logger.info("没有找到records无需删除", fullRecord, value,found);
      }
    }else{
      this.logger.info("删除域名解析失败，没有找到解析记录", fullRecord, value);
    }
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const pager = new Pager(req);
     let url = `${this.dnsEndpoint}/v2/zones?offset=${pager.getOffset()}&limit=${pager.pageSize}`;
     if (req.searchKey){
      url += `&name=${req.searchKey}`
     }
    const ret = await this.client.request({
      url,
      method: "GET"
    });
    let list = ret.zones || []
    list = list.map((item: any) => ({
      id: item.id,
      domain: item.name,
    }));
    return {
      total:ret.metadata.total_count || list.length,
      list,
    };
  }
}

new HuaweiDnsProvider();
