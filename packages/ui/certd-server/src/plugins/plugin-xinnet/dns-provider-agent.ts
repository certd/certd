import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { XinnetAgentAccess } from "./access-agent.js";
import { PageRes, PageSearch } from "@certd/pipeline";

export type XinnetAgentRecord = {
  recordId: number;
  domainName: string;
};

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: "xinnetagent",
  title: "新网(代理方式)",
  desc: "新网域名解析(代理方式)",
  icon: "svg:icon-xinnet",
  // 这里是对应的 cloudflare的access类型名称
  accessType: "xinnetagent",
  order: 7
})
export class XinnetAgentProvider extends AbstractDnsProvider<XinnetAgentRecord> {
  access!: XinnetAgentAccess;

  async onInstance() {
    //一些初始化的操作
    // 也可以通过ctx成员变量传递context
    this.access = this.ctx.access as XinnetAgentAccess;
  }

  /**
   * 创建dns解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<XinnetAgentRecord> {
    /**
     * fullRecord: '_acme-challenge.test.example.com',
     * value: 一串uuid
     * type: 'TXT',
     * domain: 'example.com'
     */
    const { fullRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value, type, domain);

 
    /**
     * /api/dns/create
     * domainName	是	string	域名名称	test-xinnet-0516-ceshi.cn
recordName	是	string	记录名	test1.test-xinnet-0516-ceshi.cn，如果是@和空字符只需要传域名即可
type	是	string	解析记录的类型 可选择类型如下: NS A CNAME MX TXT URL SRV AAAA	A
value	是	string	解析内容	192.168.1.50
line	是	string	线路	只能传"默认"
     */

    const res = await this.access.doRequest({
      url:"/api/dns/create",
      data:{
        domainName: domain,
        recordName: fullRecord,
        type: type,
        value: value,
        line: "默认"
      }
    });

  
    return {
      recordId:res,
      domainName: domain
    };
  }


  /**
   *  删除dns解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<XinnetAgentRecord>): Promise<void> {
   
    const {domainName,recordId} = options.recordRes;
    await this.access.doRequest({
      url:"/api/dns/delete",
      data:{
        recordId: recordId,
        domainName: domainName
      }
    });
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const res = await this.access.getDomainList(req);
    const list = res.list.map((item) => ({
      domain: item.domainName,
      id: item.domainName
    }));
    return {
      list: list || [],
      total: res.totalRows || 0
    }
  }

}

//实例化这个provider，将其自动注册到系统中
new XinnetAgentProvider();
