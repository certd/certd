import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { TencentAccess } from "../../plugin-lib/tencent/index.js";
import { Pager, PageRes, PageSearch } from "@certd/pipeline";

@IsDnsProvider({
  name: "tencent",
  title: "腾讯云",
  desc: "腾讯云域名DNS解析提供者",
  accessType: "tencent",
  icon: "svg:icon-tencentcloud",
})
export class TencentDnsProvider extends AbstractDnsProvider {
  access!: TencentAccess;

  client!: any;

  endpoint = "dnspod.tencentcloudapi.com";

  async onInstance() {
    this.access = this.ctx.access as TencentAccess;
    const clientConfig = {
      credential: this.access,
      region: "",
      profile: {
        httpProfile: {
          endpoint: this.endpoint,
        },
      },
    };
    const dnspodSdk = await import("tencentcloud-sdk-nodejs/tencentcloud/services/dnspod/v20210323/index.js");
    const DnspodClient = dnspodSdk.v20210323.Client;
    // 实例化要请求产品的client对象,clientProfile是可选的
    this.client = new DnspodClient(clientConfig);
  }

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value);
    const rr = fullRecord.replace("." + domain, "");

    const params = {
      Domain: domain,
      RecordType: type,
      RecordLine: "默认",
      Value: value,
      SubDomain: rr,
    };

    try {
      const ret = await this.client.CreateRecord(params);
      this.logger.info("添加域名解析成功:", fullRecord, value, JSON.stringify(ret));
      /*
        {
        "RecordId": 162,
        "RequestId": "ab4f1426-ea15-42ea-8183-dc1b44151166"
      }
   */
      return ret;
    } catch (e: any) {
      if (e?.code === "InvalidParameter.DomainRecordExist") {
        this.logger.info("域名解析已存在,无需重复添加:", fullRecord, value);
        return await this.findRecord(options);
      }
      throw e;
    }
  }

  async findRecord(options: CreateRecordOptions): Promise<any> {
    const params = {
      Domain: options.domain,
      RecordType: [options.type],
      Keyword: options.hostRecord,
      RecordValue: options.value,
    };
    const ret = await this.client.DescribeRecordFilterList(params);
    if (ret.RecordList && ret.RecordList.length > 0) {
      this.logger.info("已存在解析记录:", ret.RecordList);
      return ret.RecordList[0];
    }
    return {};
  }

  async removeRecord(options: RemoveRecordOptions<any>) {
    const { fullRecord, value, domain } = options.recordReq;
    const record = options.recordRes;
    if (!record) {
      this.logger.info("解析记录recordId为空，不执行删除", fullRecord, value);
    }
    const params = {
      Domain: domain,
      RecordId: record.RecordId,
    };
    const ret = await this.client.DeleteRecord(params);
    this.logger.info("删除域名解析成功:", fullRecord, value);
    return ret;
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const pager = new Pager(req);

    const params: any = {
      Offset: pager.getOffset(),
      Limit: pager.pageSize,
    };
    if (req.searchKey) {
      params.Keyword = req.searchKey;
    }
    const ret = await this.client.DescribeDomainList(params);
    let list = ret.DomainList || [];
    list = list.map(item => ({
      id: item.DomainId,
      domain: item.Name,
    }));
    const total = ret.DomainCountInfo?.AllTotal || list.length;
    return { total, list };
  }
}
new TencentDnsProvider();
