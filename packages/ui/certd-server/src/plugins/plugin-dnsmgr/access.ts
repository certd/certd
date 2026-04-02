import { AccessInput, BaseAccess, IsAccess, Pager, PageRes, PageSearch } from '@certd/pipeline';
import { DomainRecord } from '@certd/plugin-lib';

@IsAccess({
  name: 'dnsmgr',
  title: '彩虹DNS',
  icon: 'clarity:plugin-line',
  desc: '彩虹DNS管理系统授权',
})
export class DnsmgrAccess extends BaseAccess {
  @AccessInput({
    title: '系统地址',
    component: {
      name: "a-input",
      allowClear: true,
      placeholder: 'https://dnsmgr.example.com',
    },
    required: true,
  })
  endpoint = '';

  @AccessInput({
    title: '用户ID',
    component: {
      name: "a-input",
      allowClear: true,
      placeholder: '123456',
    },
    required: true,
  })
  uid = '';

  @AccessInput({
    title: 'API密钥',
    required: true,
    encrypt: true,
  })
  key = '';

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "点击测试接口是否正常"
  })
  testRequest = true;

  async onTestRequest() {
    await this.GetDomainList({});
    return "ok";
  }

  async GetDomainList(req: PageSearch): Promise<PageRes<DomainRecord>> {
    this.ctx.logger.info(`获取域名列表，req:${JSON.stringify(req)}`);
    const pager = new Pager(req);
    const resp = await this.doRequest({
      url: '/api/domain',
      data: {
        offset: pager.getOffset(),
        limit: pager.pageSize,
        kw: req.searchKey,
      },
    });
    const total = resp?.total || 0;
    let list = resp?.rows?.map((item: any) => {
      return {
        domain: item.name,
        ...item,
      };
    });
    return {
      total,
      list,
    };
  }



  async createDnsRecord(domainId: string, record: string, value: string, type: string, domain: string) {
    this.ctx.logger.info(`创建DNS记录：${record} ${type} ${value}`);
    const resp = await this.doRequest({
      url: `/api/record/add/${domainId}`,
      data: {
        name: record.replace(`.${domain}`, ''),
        type,
        value,
        line: 'default',
        ttl: 600,
      },
    });
    return resp;
  }

  async getDnsRecords(domainId: string, type?: string, name?: string, value?: string) {
    this.ctx.logger.info(`获取DNS记录列表：domainId=${domainId}, type=${type}, name=${name}`);
    const resp = await this.doRequest({
      url: `/api/record/data/${domainId}`,
      data: {
        type,
        subdomain: name,
        value,
      },
    });
    return resp;
  }

  async deleteDnsRecord(domainId: string, recordId: string) {
    this.ctx.logger.info(`删除DNS记录：domainId=${domainId}, recordId=${recordId}`);
    const resp = await this.doRequest({
      url: `/api/record/delete/${domainId}`,
      data: {
        recordid: recordId,
      },
    });
    return resp;
  }

  async doRequest(req: { url: string; data?: any }) {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.ctx.utils.hash.md5(`${this.uid}${timestamp}${this.key}`);
    const url = `${this.endpoint}${req.url}`;
    
    const res = await this.ctx.http.request({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: {
        uid: this.uid,
        timestamp,
        sign,
        ...req.data,
      },
    });

    if (res.code !== undefined && res.code !== 0) {
      throw new Error(res.msg || '请求失败');
    }
    return res;
  }
}
