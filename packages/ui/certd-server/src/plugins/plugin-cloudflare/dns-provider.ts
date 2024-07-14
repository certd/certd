import {
  AbstractDnsProvider,
  CreateRecordOptions,
  IsDnsProvider,
  RemoveRecordOptions,
} from '@certd/plugin-cert';
import { Autowire, HttpClient, ILogger } from '@certd/pipeline';
import { CloudflareAccess } from './access.js';

export type CloudflareRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  zone_id: string;
  zone_name: string;
  created_on: string;
  modified_on: string;
};

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: 'cloudflare',
  title: 'cloudflare',
  desc: 'cloudflare dns provider',
  // 这里是对应的 cloudflare的access类型名称
  accessType: 'cloudflare',
})
export class CloudflareDnsProvider extends AbstractDnsProvider<CloudflareRecord> {
  // 通过Autowire传递context
  @Autowire()
  logger!: ILogger;
  access!: CloudflareAccess;
  http!: HttpClient;
  async onInstance() {
    //一些初始化的操作
    // 也可以通过ctx成员变量传递context， 与Autowire效果一样
    this.access = this.ctx.access as CloudflareAccess;
    this.http = this.ctx.http;
  }

  async getZoneId(domain: string) {
    const url = `https://api.cloudflare.com/client/v4/zones?name=${domain}`;
    const res = await this.doRequestApi(url, null, 'get');
    return res.result[0].id;
  }

  private async doRequestApi(url: string, data: any = null, method = 'post') {
    const res = await this.http.request<any, any>({
      url,
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.access.apiToken}`,
      },
      data,
    });
    if (!res.success) {
      throw new Error(`${JSON.stringify(res.errors)}`);
    }
    return res;
  }

  /**
   * 创建dns解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<CloudflareRecord> {
    /**
     * fullRecord: '_acme-challenge.test.example.com',
     * value: 一串uuid
     * type: 'TXT',
     * domain: 'example.com'
     */
    const { fullRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, type, domain);

    const zoneId = await this.getZoneId(domain);
    this.logger.info('获取zoneId成功:', zoneId);

    // 给domain下创建txt类型的dns解析记录，fullRecord
    const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
    const res = await this.doRequestApi(url, {
      content: value,
      name: fullRecord,
      type: type,
      ttl: 60,
    });
    const record = res.result as CloudflareRecord;
    this.logger.info(
      `添加域名解析成功:fullRecord=${fullRecord},value=${value}`
    );
    this.logger.info(`dns解析记录:${JSON.stringify(record)}`);

    //本接口需要返回本次创建的dns解析记录，这个记录会在删除的时候用到
    return record;
  }

  /**
   *  删除dns解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(
    options: RemoveRecordOptions<CloudflareRecord>
  ): Promise<void> {
    const { fullRecord, value, record } = options;
    this.logger.info('删除域名解析：', fullRecord, value);
    if (!record) {
      this.logger.info('record不存在');
      return;
    }
    //这里调用删除txt dns解析记录接口
    const zoneId = record.zone_id;
    const recordId = record.id;
    const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`;
    await this.doRequestApi(url, null, 'delete');
    this.logger.info(
      `删除域名解析成功:fullRecord=${fullRecord},value=${value}`
    );
  }
}

//实例化这个provider，将其自动注册到系统中
new CloudflareDnsProvider();
