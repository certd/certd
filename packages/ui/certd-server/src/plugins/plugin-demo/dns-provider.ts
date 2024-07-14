import {
  AbstractDnsProvider,
  CreateRecordOptions,
  IsDnsProvider,
  RemoveRecordOptions,
} from '@certd/plugin-cert';
import { Autowire, HttpClient, ILogger } from '@certd/pipeline';
import { DemoAccess } from './access.js';

type DemoRecord = {
  // 这里定义Record记录的数据结构，跟对应云平台接口返回值一样即可，一般是拿到id就行，用于删除txt解析记录，清理申请痕迹
  // id:string
};

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: 'demo',
  title: 'Dns提供商Demo',
  desc: 'dns provider示例',
  // 这里是对应的云平台的access类型名称
  accessType: 'demo',
})
export class DemoDnsProvider extends AbstractDnsProvider<DemoRecord> {
  // 通过Autowire注入工具对象
  @Autowire()
  access!: DemoAccess;
  @Autowire()
  logger!: ILogger;
  http!: HttpClient;

  async onInstance() {
    // 也可以通过ctx成员变量传递context， 与Autowire效果一样
    this.http = this.ctx.http;
    this.logger.debug('access', this.access);
    //初始化的操作
    //...
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

    // 调用创建dns解析记录的对应的云端接口，创建txt类型的dns解析记录
    // 请根据实际接口情况调用，例如：
    // const createDnsRecordUrl = "xxx"
    // const record = this.http.post(createDnsRecordUrl,{
    //   // 授权参数
    //   // 创建dns解析记录的参数
    // })
    // //返回本次创建的dns解析记录，这个记录会在删除的时候用到
    // return record
  }

  /**
   *  删除dns解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<DemoRecord>): Promise<void> {
    const { fullRecord, value, record } = options;
    this.logger.info('删除域名解析：', fullRecord, value, record);
    //这里调用删除txt dns解析记录接口
    //请根据实际接口情况调用，例如：

    // const deleteDnsRecordUrl = "xxx"
    // const res = this.http.delete(deleteDnsRecordUrl,{
    //   // 授权参数
    //   // 删除dns解析记录的参数
    // })
    //

    this.logger.info('删除域名解析成功:', fullRecord, value);
  }
}

//TODO 实例化这个provider，将其自动注册到系统中
new DemoDnsProvider();
