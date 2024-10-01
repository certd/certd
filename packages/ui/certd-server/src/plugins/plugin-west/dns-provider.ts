import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';
import { Autowire, HttpClient, ILogger } from '@certd/pipeline';
import { WestAccess } from './access.js';

type westRecord = {
  // 这里定义Record记录的数据结构，跟对应云平台接口返回值一样即可，一般是拿到id就行，用于删除txt解析记录，清理申请痕迹
  code: number;
  msg: string;
  body: {
    record_id: number;
  };
};

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: 'west',
  title: '西部数码',
  desc: 'west dns provider',
  // 这里是对应的云平台的access类型名称
  accessType: 'west',
})
export class WestDnsProvider extends AbstractDnsProvider<westRecord> {
  // 通过Autowire注入工具对象
  @Autowire()
  access!: WestAccess;
  @Autowire()
  logger!: ILogger;
  http!: HttpClient;

  async onInstance() {
    // 也可以通过ctx成员变量传递context， 与Autowire效果一样
    this.http = this.ctx.http;
    this.logger.debug('access:', this.access);
    //初始化的操作
    //...
  }

  private async doRequestApi(url: string, data: any = null, method = 'post') {
    if (this.access.scope === 'account') {
      data.apikey = this.ctx.utils.hash.md5(this.access.apikey);
      data.username = this.access.username;
    } else {
      data.apidomainkey = this.access.apidomainkey;
    }
    const res = await this.http.request<any, any>({
      url,
      method,
      data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    if (res.msg !== 'success') {
      throw new Error(`${JSON.stringify(res.msg)}`);
    }
    return res;
  }

  /**
   * 创建dns解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<any> {
    /**
     * options 参数说明
     * fullRecord: '_acme-challenge.example.com',
     * value: 一串uuid
     * type: 'TXT',
     * domain: 'example.com'
     */
    const { fullRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, type, domain);

    // 准备要发送到API的请求体
    const requestBody = {
      act: 'dnsrec.add', // API动作类型
      domain: domain, // 域名
      record_type: 'TXT', // DNS记录类型
      hostname: fullRecord, // 完整的记录名
      record_value: value, // 记录的值
      record_line: '', // 记录线路
      record_ttl: 60, // TTL (生存时间)，设置为60秒
    };

    const url = 'https://api.west.cn/API/v2/domain/dns/';
    const res = await this.doRequestApi(url, requestBody);
    const record = res as westRecord;
    this.logger.info(`添加域名解析成功:fullRecord=${fullRecord},value=${value}`);
    this.logger.info(`dns解析记录:${JSON.stringify(record)}`);
    // 西部数码生效较慢 增加90秒等待 提高成功率
    this.logger.info('等待解析生效:wait 90s');
    await new Promise(resolve => setTimeout(resolve, 90000));
    return record;
  }

  /**
   *  删除dns解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<westRecord>): Promise<void> {
    const { fullRecord, value, record, domain } = options;
    this.logger.info('删除域名解析：', fullRecord, value, record);
    if (!record) {
      this.logger.info('record不存在');
      return;
    }
    //这里调用删除txt dns解析记录接口

    // 准备要发送到API的请求体
    const requestBody = {
      act: 'dnsrec.remove', // API动作类型
      domain: domain, // 域名
      record_id: record.body.record_id,
      hostname: fullRecord, // 完整的记录名
      record_type: 'TXT', // DNS记录类型
      record_line: '', // 记录线路
    };

    const url = 'https://api.west.cn/API/v2/domain/dns/';
    const res = await this.doRequestApi(url, requestBody);
    const result = res.result;
    this.logger.info('删除域名解析成功:', fullRecord, value, JSON.stringify(result));
  }
}

//TODO 实例化这个provider，将其自动注册到系统中
new WestDnsProvider();
