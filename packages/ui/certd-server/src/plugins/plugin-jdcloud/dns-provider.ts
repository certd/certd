import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { JDCloudAccess } from "./access.js";
import { Pager, PageRes, PageSearch } from "@certd/pipeline";

@IsDnsProvider({
  name: "jdcloud",
  title: "京东云",
  desc: "京东云DNS解析提供商",
  accessType: "jdcloud",
  icon: "svg:icon-jdcloud",
  order:3,
})
export class JDCloudDnsProvider extends AbstractDnsProvider {
  access!: JDCloudAccess;


  async onInstance() {
    this.access = this.ctx.access as JDCloudAccess
  }



  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, hostRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value, domain);

    const service = await this.getJDDomainService();

    const domainRes = await service.describeDomains({
      domainName: domain,
      pageNumber: 1,
      pageSize: 10
    })
    if (!domainRes.result?.dataList?.length) {
      throw new Error(`域名${domain}在此京东云账号中不存在`)
    }

    const domainId = domainRes.result.dataList[0].id
    this.logger.info("域名ID：", domainId)
    /**
     * hostRecord	String	True		主机记录
     * hostValue	String	True		解析记录的值
     * jcloudRes	Boolean	False		是否是京东云资源
     * mxPriority	Integer	False		优先级，只存在于MX, SRV解析记录类型
     * port	Integer	False		端口，只存在于SRV解析记录类型
     * ttl	Integer	True		解析记录的生存时间，单位：秒
     * type	String	True		解析的类型，请参考解析记录类型详解
     * weight	Integer	False		解析记录的权重，目前支持权重的有：A/AAAA/CNAME/JNAME，A/AAAA权重范围：0-100、CNAME/JNAME权重范围：1-100。
     * viewValue	Integer	True		解析线路的ID，请调用describeViewTree接口获取基础解
     */
    try{
      const res = await service.createResourceRecord({
        domainId: domainId,
        req:{
          hostRecord: hostRecord,
          hostValue: value,
          type: type,
          ttl: 100,
        }
      })
      return {
        recordId: res.result.dataList[0].id,
        domainId: domainId
      };
    }catch (e) {
      if (e.error){
        this.logger.error(JSON.stringify(e.error))
        throw new Error(JSON.stringify(e.error))
      }
      throw e
    }



  }

  async removeRecord(options: RemoveRecordOptions<any>): Promise<any> {
    const record = options.recordRes;

    const service = await this.getJDDomainService();
    await service.deleteResourceRecord({
      domainId: record.domainId,
      resourceRecordId: record.recordId
    })
  }

  private async  getJDDomainService() {
    const {JDDomainService} = await import("@certd/jdcloud")
    const service = new JDDomainService({
      credentials: {
        accessKeyId: this.access.accessKeyId,
        secretAccessKey: this.access.secretAccessKey
      },
      regionId: "cn-north-1" //地域信息，某个api调用可以单独传参regionId，如果不传则会使用此配置中的regionId
    });
    return service;
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const pager = new Pager(req);
    const service = await this.getJDDomainService();
    const domainRes = await service.describeDomains({
      domainName: req.searchKey,
      pageNumber: pager.pageNo,
      pageSize: pager.pageSize,
    })
    let list = domainRes.result?.dataList || []
    list = list.map((item: any) => ({
      id: item.domainId,
      domain: item.domainName,
    }));
    return {
      total:domainRes.result.totalCount || list.length,
      list,
    };
  }

}

new JDCloudDnsProvider();
