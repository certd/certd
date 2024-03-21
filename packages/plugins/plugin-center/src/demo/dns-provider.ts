import _ from "lodash";
import { CreateRecordOptions, IDnsProvider, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { Autowire, ILogger } from "@certd/pipeline";
import { DemoAccess } from "./access";

// TODO  这里注册一个dnsProvider
@IsDnsProvider({
  name: "demo",
  title: "Dns提供商Demo",
  desc: "demo dns provider示例",
  accessType: "demo",
})
export class DemoDnsProvider implements IDnsProvider {
  @Autowire()
  access!: DemoAccess;
  @Autowire()
  logger!: ILogger;

  async onInstance() {
    const access: any = this.access;
    this.logger.debug("access",access)
    //初始化的操作
    //...
  }

  async getDomainList():Promise<any[]> {
    // TODO 这里你要实现一个获取域名列表的方法
    const access = this.access
    this.logger.debug("access",access)
    return []
  }

  async matchDomain(dnsRecord: string):Promise<any> {
    const domainList = await this.getDomainList();
    let domainRecord = null;
    for (const item of domainList) {
      //TODO 根据域名去匹配账户中是否有该域名, 这里不一定是item.name 具体要看你要实现的平台的接口而定
      if (_.endsWith(dnsRecord + ".", item.name)) {
        domainRecord = item;
        break;
      }
    }
    if (!domainRecord) {
      this.logger.info("账户中域名列表:",domainList)
      this.logger.error("找不到域名，请确认账户中是否真的有此域名")
      throw new Error("can not find Domain:"+dnsRecord);
    }
    return domainRecord;
  }



  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type } = options;
    this.logger.info("添加域名解析：", fullRecord, value,type);
    //先确定账户中是否有该域名
    const domainRecord = await this.matchDomain(fullRecord);
    this.logger.debug("matchDomain:",domainRecord)
    //TODO 然后调用接口，创建txt类型的dns解析记录
    // .. 这里调用对应平台的后台接口
    const access = this.access
    this.logger.debug("access",access)



  }
  async removeRecord(options: RemoveRecordOptions): Promise<any> {
    const { fullRecord, value, record } = options;
    this.logger.info("删除域名解析：", fullRecord, value,record);
    //TODO 这里调用删除txt dns解析记录接口
    const access = this.access
    this.logger.debug("access",access)
    this.logger.info("删除域名解析成功:", fullRecord, value);
  }
}

//TODO 实例化这个provider，将其自动注册到系统中
new DemoDnsProvider();
