import { IsAccess, AccessInput, BaseAccess, PageSearch, PageRes, Pager } from '@certd/pipeline';
import { DomainRecord } from '@certd/plugin-lib';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'dnsla',
  title: 'dns.la授权',
  icon: 'arcticons:dns-changer-3',
  desc: '',
})
export class DnslaAccess extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'APIID',
    component: {
      placeholder: 'APIID',
    },
    helper: "从我的账户->API密钥中获取 APIID APISecret",
    required: true,
    encrypt: false,
  })
  apiId = '';

  @AccessInput({
    title: 'APISecret',
    component: {
      placeholder: '',
    },
    helper:
      '',
    required: false,
    encrypt: true,
  })
  apiSecret = '';

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "测试授权是否正确"
  })
  testRequest = true;

  async onTestRequest() {
    await this.getDomainListPage({
      pageNo: 1,
      pageSize: 1,
    });
    return "ok";
  }


  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const pager = new Pager(req);
    const url = `/api/domainList?pageIndex=${pager.pageNo}&pageSize=${pager.pageSize}`;
    const ret = await this.doRequestApi(url, null, 'get');

    let list = ret.data.results || []
    list = list.map((item: any) => ({
      id: item.id,
      domain: item.domain,
    }));
    const total = ret.data.total || list.length;
    return {
      total,
      list,
    };
  }



  async doRequestApi(url: string, data: any = null, method = 'post') {
    /**
     * Basic 认证
     * 我的账户 API 密钥 中获取 APIID APISecret
     * APIID=myApiId
     * APISecret=mySecret
     * 生成 Basic 令牌
     * # 用冒号连接 APIID APISecret
     * str = "myApiId:mySecret"
     * token = base64Encode(str)
     * 在请求头中添加 Basic 认证令牌
     * Authorization: Basic {token}
     * 响应示例
     * application/json
     * {
     *  "code":200,
     *  "msg":"",
     *  "data":{}
     * }
     */
    const token = Buffer.from(`${this.apiId}:${this.apiSecret}`).toString('base64');
    const res = await this.ctx.http.request<any, any>({
      url: "https://api.dns.la" + url,
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${token}`,
      },
      data,
    });

    if (res.code !== 200) {
      throw new Error(res.msg);
    }
    return res;

  }

}

new DnslaAccess();
