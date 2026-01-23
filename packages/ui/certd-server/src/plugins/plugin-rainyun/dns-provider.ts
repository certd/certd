import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { RainyunAccess } from "./access.js";
import { Pager, PageRes, PageSearch } from "@certd/pipeline";

@IsDnsProvider({
  name: "rainyun",
  title: "雨云",
  desc: "雨云DNS解析提供商",
  accessType: "rainyun",
  icon: "svg:icon-rainyun",
})
export class RainyunDnsProvider extends AbstractDnsProvider {

  client: any;

  async onInstance() {

  }

  async createRecord(options: CreateRecordOptions): Promise<any> {

    const access: RainyunAccess = this.ctx.access as RainyunAccess;

    const domainId = await access.getDomainId(options.domain);
    if (!domainId) {
      throw new Error(`域名${options.domain}未找到`);
    }

    const { fullRecord, hostRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value, domain);

    const ret = await access.doRequest({
      url: `/product/domain/${domainId}/dns`,
      method: "POST",
      data: {
        host: hostRecord,
        value: value,
        level: 1,
        type: type,
        line: "DEFAULT",
        ttl: 60
      }
    });
    this.logger.info("添加域名解析成功:", JSON.stringify(options), ret);
    return {
      recordId: ret,
      domainId: domainId
    };

  }


  async removeRecord(options: RemoveRecordOptions<any>): Promise<any> {
    const { fullRecord, value } = options.recordReq;
    const access: RainyunAccess = this.ctx.access as RainyunAccess;
    const record = options.recordRes;
    const ret = await access.doRequest({
      url: `/product/domain/${record.domainId}/dns?record_id=${record.recordId}`,
      method: "DELETE",
    });
    this.logger.info("删除域名解析成功:", fullRecord, value, ret);
    return ret;
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const access: RainyunAccess = this.ctx.access as RainyunAccess;
    const pager = new Pager(req);
    const ret = await access.getDomainList({
      offset: pager.getOffset(),
      limit: pager.pageSize,
      query: req.searchKey,
    })
    // this.logger.info("获取域名列表成功:", ret);
    const list = ret.list.map((item: any) => ({
      id: item.id,
      domain: item.domain,
    }));
    return {
      total:ret.total || list.length,
      list,
    };
  }
}

new RainyunDnsProvider();
