import { Pager, PageRes, PageSearch } from "@certd/pipeline";
import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { GoogleAccess } from "../plugin-cert/access/index.js";

// TODO: 接口待明确 - 需要确认Google Cloud DNS API的具体参数和返回值格式

export type GoogleCloudDnsRecord = {
  name: string;
  type: string;
  ttl: number;
  rrdatas: string[];
  zoneId: string;
  projectId: string;
};

@IsDnsProvider({
  name: "google-cloud-dns",
  title: "Google Cloud DNS",
  desc: "Google Cloud DNS提供商",
  icon: "flat-color-icons:google",
  accessType: "google",
  order: 50,
})
export class GoogleCloudDnsProvider extends AbstractDnsProvider<GoogleCloudDnsRecord> {
  access!: GoogleAccess;
  projectId!: string;
  credentials!: any;
  envHttpsProxy = "";

  async onInstance() {
    this.access = this.ctx.access as GoogleAccess;
    if (!this.access.serviceAccountSecret) {
      throw new Error("服务账号密钥不能为空");
    }
    this.credentials = JSON.parse(this.access.serviceAccountSecret);
    this.projectId = this.credentials.project_id;
    this.logger.debug("Google Cloud DNS Provider 初始化成功");
  }

  private async setupProxy() {
    if (this.access.httpsProxy) {
      this.envHttpsProxy = process.env.HTTPS_PROXY || "";
      process.env.HTTPS_PROXY = this.access.httpsProxy;
    }
  }

  private async restoreProxy() {
    if (this.envHttpsProxy) {
      process.env.HTTPS_PROXY = this.envHttpsProxy;
      this.envHttpsProxy = "";
    }
  }

  private async getGoogleDnsClient() {
    const { DNS } = await import("@google-cloud/dns");
    return new DNS({ credentials: this.credentials });
  }

  private async findManagedZone(domain: string): Promise<any> {
    const dns = await this.getGoogleDnsClient();
    const [zones] = await dns.getZones();

    // 查找匹配的托管区域
    const normalizedDomain = domain.endsWith(".") ? domain : domain + ".";
    for (const zone of zones) {
      const zoneDnsName = zone.metadata.dnsName;
      if (normalizedDomain.endsWith(zoneDnsName) || zoneDnsName === normalizedDomain) {
        return zone;
      }
    }
    throw new Error(`未找到域名 ${domain} 对应的托管区域`);
  }

  private async getExistingRecord(zone: any, recordName: string, type: string): Promise<any> {
    const [records] = await zone.getRecords({
      name: recordName,
      type: type,
    });
    return records.length > 0 ? records[0] : null;
  }

  // 去掉引号的辅助函数
  private stripQuotes(str: string): string {
    return str.replace(/^"|"$/g, "");
  }

  // 添加引号的辅助函数（如果没有的话）
  private addQuotes(str: string): string {
    if (str.startsWith('"') && str.endsWith('"')) {
      return str;
    }
    return `"${str}"`;
  }
  // 比较值是否相等（忽略引号）
  private valuesEqual(a: string, b: string): boolean {
    return this.stripQuotes(a) === this.stripQuotes(b);
  }

  async createRecord(options: CreateRecordOptions): Promise<GoogleCloudDnsRecord> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info("Google Cloud DNS: 添加解析记录", fullRecord, value, type, domain);

    await this.setupProxy();
    try {
      const zone = await this.findManagedZone(domain);
      const recordName = fullRecord.endsWith(".") ? fullRecord : fullRecord + ".";

      // 检查是否已存在该记录集
      const existingRecord = await this.getExistingRecord(zone, recordName, type);

      let newRrdatas: string[];
      let ttl: number;
      if (existingRecord) {
        // 记录已存在，追加新值
        this.logger.info("Google Cloud DNS: 记录已存在，追加新值");
        const existingRrdatas = existingRecord.metadata.rrdatas || [];

        // 检查值是否已存在（忽略引号）
        const valueExists = existingRrdatas.some((existing: string) => this.valuesEqual(existing, value));

        if (valueExists) {
          this.logger.info("Google Cloud DNS: 值已存在，无需重复添加", fullRecord, value);
          return {
            name: recordName,
            type: type,
            ttl: existingRecord.metadata.ttl,
            rrdatas: existingRrdatas,
            zoneId: zone.metadata.name,
            projectId: this.projectId,
          };
        }

        newRrdatas = [...existingRrdatas, this.addQuotes(value)];
        ttl = existingRecord.metadata.ttl;
      } else {
        // 创建新记录，加上引号
        newRrdatas = [this.addQuotes(value)];
        ttl = 60;
      }

      const changeConfig: any = {};

      // 如果存在旧记录，需要先删除
      if (existingRecord) {
        // 使用Record对象格式
        changeConfig.delete = existingRecord;
      }

      // 创建新的Record对象
      const newRecord = zone.record(type, {
        name: recordName,
        data: newRrdatas,
        ttl: ttl,
      });
      changeConfig.add = newRecord;

      await zone.createChange(changeConfig);

      this.logger.info("Google Cloud DNS: 解析记录创建成功", fullRecord);

      return {
        name: recordName,
        type: type,
        ttl: ttl,
        rrdatas: newRrdatas, // 已经包含引号了
        zoneId: zone.metadata.name,
        projectId: this.projectId,
      };
    } finally {
      await this.restoreProxy();
    }
  }

  async removeRecord(options: RemoveRecordOptions<GoogleCloudDnsRecord>): Promise<void> {
    const { fullRecord, value } = options.recordReq;
    const record = options.recordRes;
    this.logger.info("Google Cloud DNS: 删除解析记录", fullRecord, value);

    if (!record) {
      this.logger.info("记录为空，不执行删除");
      return;
    }

    await this.setupProxy();
    try {
      const dns = await this.getGoogleDnsClient();
      const zone = dns.zone(record.zoneId);
      const recordName = record.name;

      // 先获取服务器最新的记录状态
      const existingRecord = await this.getExistingRecord(zone, recordName, record.type);

      if (!existingRecord) {
        this.logger.info("Google Cloud DNS: 记录已不存在，无需删除", fullRecord);
        return;
      }

      const currentRrdatas = existingRecord.metadata.rrdatas || [];

      // 检查要删除的值是否存在（忽略引号）
      const valueIndex = currentRrdatas.findIndex((existing: string) => this.valuesEqual(existing, value));

      if (valueIndex === -1) {
        this.logger.info("Google Cloud DNS: 要删除的值不存在", fullRecord, value);
        return;
      }

      // 过滤掉要删除的值（精确匹配找到的那个，保持其他记录的原样）
      const newRrdatas = currentRrdatas.filter((_: string, i: number) => i !== valueIndex);

      const changeConfig: any = {
        delete: existingRecord,
      };

      if (newRrdatas.length > 0) {
        // 还有剩余值，添加更新后的记录
        const newRecord = zone.record(record.type, {
          name: recordName,
          data: newRrdatas,
          ttl: existingRecord.metadata.ttl,
        });
        changeConfig.add = newRecord;
        this.logger.info("Google Cloud DNS: 记录值已移除，剩余值", fullRecord, newRrdatas);
      } else {
        this.logger.info("Google Cloud DNS: 记录集已删除（无剩余值）", fullRecord);
      }

      await zone.createChange(changeConfig);
    } catch (error: any) {
      this.logger.error("Google Cloud DNS: 删除解析记录失败", error.message);
      // 即使删除失败也不抛出异常，避免影响整个证书申请流程
    } finally {
      await this.restoreProxy();
    }
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    await this.setupProxy();
    try {
      const pager = new Pager(req);
      const dns = await this.getGoogleDnsClient();
      const [zones] = await dns.getZones({
        maxResults: pager.pageSize,
        pageToken: pager.pageNo > 1 ? String(pager.pageNo) : undefined,
      });

      const list: DomainRecord[] = zones.map((zone: any) => ({
        id: zone.metadata.name,
        domain: zone.metadata.dnsName.replace(/\.$/, ""), // 去掉结尾的点
      }));

      // 简单的搜索过滤
      let filteredList = list;
      if (req.searchKey) {
        filteredList = list.filter(item => item.domain.toLowerCase().includes(req.searchKey.toLowerCase()));
      }

      return {
        list: filteredList,
        total: zones.length,
      };
    } finally {
      await this.restoreProxy();
    }
  }
}

// 实例化插件
new GoogleCloudDnsProvider();
