import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { Autowire, HttpClient, ILogger } from "@certd/pipeline";
import { CloudflareAccess } from "./access";

// TODO  这里注册一个dnsProvider
@IsDnsProvider({
  name: 'cloudflare',
  title: 'dns提供商cloudflare',
  desc: 'cloudflare dns provider示例',
  accessType: 'cloudflare',
})
export class CloudflareDnsProvider extends AbstractDnsProvider{
  @Autowire()
  logger! : ILogger;
  access!: CloudflareAccess;
  http!: HttpClient;
  async onInstance() {
    //一些初始化的操作
    this.access = this.ctx.access as CloudflareAccess;
    this.http = this.ctx.http
  }


  /**
   * curl --request POST \
   *   --url https://api.cloudflare.com/client/v4/zones/zone_id/dns_records \
   *   --header 'Content-Type: application/json' \
   *   --header 'X-Auth-Email: ' \
   *   --data '{
   *   "content": "198.51.100.4",
   *   "name": "example.com",
   *   "proxied": false,
   *   "type": "A",
   *   "comment": "Domain verification record",
   *   "tags": [
   *     "owner:dns-team"
   *   ],
   *   "ttl": 60
   * }'
   */
  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type,domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, type,domain);

    this.http.post('https://api.cloudflare.com/client/v4/zones/zone_id/dns_records')

    //TODO 然后调用接口，创建txt类型的dns解析记录
    // .. 这里调用对应平台的后台接口
    const access = this.access;
    this.logger.debug('access', access);
  }
  async removeRecord(options: RemoveRecordOptions): Promise<any> {
    const { fullRecord, value, record } = options;
    this.logger.info('删除域名解析：', fullRecord, value, record);
    //TODO 这里调用删除txt dns解析记录接口
    const access = this.access;
    this.logger.debug('access', access);
    this.logger.info('删除域名解析成功:', fullRecord, value);
  }
}

//TODO 实例化这个provider，将其自动注册到系统中
new CloudflareDnsProvider();
