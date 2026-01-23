import {AccessInput, BaseAccess, IsAccess, Pager, PageSearch} from '@certd/pipeline';
import {HttpRequestConfig} from "@certd/basic";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'godaddy',
  title: 'godaddy授权',
  icon: 'simple-icons:godaddy',
  desc: '',
})
export class GodaddyAccess extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'Key',
    component: {
      placeholder: '授权key',
    },
    helper:"[https://developer.godaddy.com/keys](https://developer.godaddy.com/keys)，创建key（选择product，不要选择ote）",
    required: true,
    encrypt: false,
  })
  key = '';

  @AccessInput({
    title: 'Secret',
    component: {
      name:"a-input-password",
      vModel:"value",
    },
    required: true,
    encrypt: true,
  })
  secret = '';

  @AccessInput({
    title: 'HTTP代理',
    component: {
      placeholder: 'http://xxxxx:xx',
    },
    helper: '使用https_proxy',
    required: false,
  })
  httpProxy = '';

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "点击测试接口是否正常(注意账号中必须要有50个域名才能使用API接口)"
  })
  testRequest = true;

  async onTestRequest() {
    const res = await this.getDomainList({pageSize:1});
    this.ctx.logger.info(res)
    return "ok"
  }


  async getDomainList(opts?: PageSearch){

    const pager = new Pager(opts);
    const req = {
      url :`/v1/domains?limit=${pager.pageSize}&offset=${pager.getOffset()}`,
      method: "get",
    }
    return await this.doRequest(req);
  }


  async doRequest(req: HttpRequestConfig){
    const headers = {
      "Authorization": `sso-key ${this.key}:${this.secret}`,
      ...req.headers
    };
    return await this.ctx.http.request({
      headers,
      baseURL: "https://api.godaddy.com",
      ...req,
      logRes: true,
      httpProxy: this.httpProxy,
    });
  }



}

new GodaddyAccess();
