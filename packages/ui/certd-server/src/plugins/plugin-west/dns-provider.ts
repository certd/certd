import { PageRes, PageSearch } from "@certd/pipeline";
import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { WestAccess } from "./access.js";
import { WestDnsProviderDomain } from "./dns-provider-domain.js";

type westRecord = {
  // 这里定义Record记录的数据结构，跟对应云平台接口返回值一样即可，一般是拿到id就行，用于删除txt解析记录，清理申请痕迹
  result: number;
  msg: string;
  data: {
    id: number;
  };
};

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: "west",
  title: "西部数码",
  desc: "west dns provider",
  icon: "svg:icon-xibushuma",
  // 这里是对应的云平台的access类型名称
  accessType: "west",
})
export class WestDnsProvider extends AbstractDnsProvider<westRecord> {
  access!: WestAccess;

  async onInstance() {
    this.access = this.ctx.access as WestAccess;
    // 也可以通过ctx成员变量传递context
    this.logger.debug("access:", this.access);
    //初始化的操作
    //...
  }

  getDomainProvider() {
    const provider = new WestDnsProviderDomain();
    provider.access = this.access;
    provider.logger = this.logger;
    provider.ctx = this.ctx;
    provider.http = this.http;
    return provider;
  }

  /**
   * 创建dns解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<any> {
    if (this.access.scope === "domain") {
      //如果是域名级别的，走老接口
      const provider = this.getDomainProvider();
      return provider.createRecord(options);
    }

    /**
     * options 参数说明
     * fullRecord: '_acme-challenge.example.com',
     * value: 一串uuid
     * type: 'TXT',
     * domain: 'example.com'
     */
    const { fullRecord, value, type, domain, hostRecord } = options;
    this.logger.info("添加域名解析：", fullRecord, value, type, domain);

    // 准备要发送到API的请求体
    const requestBody = {
      act: "adddnsrecord", // API动作类型
      domain: domain, // 域名
      type: "TXT", // DNS记录类型
      host: hostRecord, // 完整的记录名
      value: value, // 记录的值
      line: "", // 记录线路
      ttl: 60, // TTL (生存时间)，设置为60秒
    };

    const url = "/v2/domain/";
    const res = await this.access.doRequest({
      url,
      method: "POST",
      data: requestBody,
    });
    const record = res as westRecord;
    this.logger.info(`添加域名解析成功:fullRecord=${fullRecord},value=${value}`);
    this.logger.info(`dns解析记录:${JSON.stringify(record)}`);
    // 西部数码生效较慢 增加90秒等待 提高成功率
    this.logger.info("等待解析生效:wait 90s");
    await new Promise(resolve => setTimeout(resolve, 90000));
    return record;
  }

  /**
   *  删除dns解析记录,清理申请痕迹
   * https://console-docs.apipost.cn/preview/ab2c3103b22855ba/fac91d1e43fafb69?target_id=c4564349-6687-413d-a3d4-b0e8db5b34b2
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<westRecord>): Promise<void> {
    if (this.access.scope === "domain") {
      //如果是域名级别的，走老接口
      const provider = this.getDomainProvider();
      return provider.removeRecord(options as any);
    }

    const { fullRecord, value, domain } = options.recordReq;
    const record = options.recordRes;
    this.logger.info("删除域名解析：", fullRecord, value, record);
    if (!record) {
      this.logger.info("record不存在");
      return;
    }
    //这里调用删除txt dns解析记录接口
    const record_id = record.data?.id;
    if (!record_id) {
      this.logger.info("record_id不存在");
      return;
    }
    // 准备要发送到API的请求体
    const requestBody = {
      act: "deldnsrecord", // API动作类型
      domain: domain, // 域名
      id: record_id,
    };

    const url = "/v2/domain/";
    const res = await this.access.doRequest({
      url,
      method: "POST",
      data: requestBody,
    });
    const result = res.result;
    this.logger.info("删除域名解析成功:", fullRecord, value, JSON.stringify(result));
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    return await this.access.getDomainList(req);
  }
}

//TODO 实例化这个provider，将其自动注册到系统中
new WestDnsProvider();
