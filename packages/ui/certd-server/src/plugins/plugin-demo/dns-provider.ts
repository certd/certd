import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { Autowire, ILogger } from "@certd/pipeline";
import { DemoAccess } from "./access";

// TODO  这里注册一个dnsProvider
@IsDnsProvider({
  name: 'demo',
  title: 'Dns提供商Demo',
  desc: 'dns provider示例',
  accessType: 'demo', //这里是对应的access name
})
export class DemoDnsProvider extends AbstractDnsProvider {
  @Autowire()
  access!: DemoAccess;
  @Autowire()
  logger!: ILogger;

  async onInstance() {
    const access: any = this.access;
    this.logger.debug('access', access);
    //初始化的操作
    //...
  }


  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type,domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, type,domain);
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
new DemoDnsProvider();
