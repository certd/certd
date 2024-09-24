import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';
import { Autowire, ILogger } from '@certd/pipeline';
import { DynadotAccess } from './access.js';
import querystring from 'querystring';

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: 'dynadot',
  title: 'dynadot',
  desc: 'dynadot dns provider',
  // 这里是对应的 cloudflare的access类型名称
  accessType: 'dynadot',
})
export class DynadotDnsProvider extends AbstractDnsProvider {
  // 通过Autowire传递context
  @Autowire()
  logger!: ILogger;
  access!: DynadotAccess;
  async onInstance() {
    this.access = this.ctx.access as DynadotAccess;
  }

  private async doRequest(command: string, query: any) {
    const baseUrl = 'https://api.dynadot.com/api3.json?key=' + this.access.apiProductionKey;
    const qs = querystring.stringify(query);
    const url = `${baseUrl}&command=${command}&${qs}`;
    const res = await this.ctx.http.request<any, any>({
      url,
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    /*
    "SetDnsResponse": {
    "ResponseCode": 0,
    "Status": "success"
  }
     */
    for (const resKey in res) {
      if (res[resKey].ResponseCode != null && res[resKey].ResponseCode !== 0) {
        throw new Error(`请求失败：${res[resKey].Status}`);
      }
    }
    return res;
  }

  /**
   * 创建dns解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions) {
    /**
     * fullRecord: '_acme-challenge.test.example.com',
     * value: 一串uuid
     * type: 'TXT',
     * domain: 'example.com'
     */
    const { fullRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, type, domain);

    const prefix = fullRecord.replace(`.${domain}`, '');
    // 给domain下创建txt类型的dns解析记录，fullRecord
    const res = await this.doRequest('set_dns2', {
      domain: domain,
      subdomain0: prefix,
      sub_record_type0: 'TXT',
      sub_record0 : value,
    });
    this.logger.info(`添加域名解析成功:fullRecord=${fullRecord},value=${value}`);
    this.logger.info(`请求结果:${JSON.stringify(res)}`);

    //本接口需要返回本次创建的dns解析记录，这个记录会在删除的时候用到
    return {};
  }

  /**
   *  删除dns解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<any>): Promise<void> {}
}

//实例化这个provider，将其自动注册到系统中
new DynadotDnsProvider();
