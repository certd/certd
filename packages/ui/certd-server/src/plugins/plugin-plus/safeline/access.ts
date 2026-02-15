import { HttpRequestConfig } from "@certd/basic";
import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "safeline",
  title: "长亭雷池授权",
  icon: "svg:icon-safeline",
})
export class SafelineAccess extends BaseAccess {
  @AccessInput({
    title: "雷池的访问url",
    component: {
      placeholder: "https://xxxx.com:9443",
    },
    required: true,
  })
  baseUrl = "";

  @AccessInput({
    title: "ApiToken",
    component: {
      placeholder: "apiToken",
    },
    helper: "",
    required: true,
    encrypt: true,
  })
  apiToken = "";

  @AccessInput({
    title: "忽略证书校验",
    value: true,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "如果面板的url是https，且使用的是自签名证书，则需要开启此选项，其他情况可以关闭",
  })
  skipSslVerify = true;

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "onTestRequest",
    },
    helper: "点击测试接口看是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    await this.getCertList();
    return "ok";
  }

  async getCertList() {
    const res = await this.doRequest({
      url: "/api/open/cert",
      method: "get",
      data: {},
    });
    const nodes = res?.nodes || [];
    return nodes
  }


  async doRequest(config: HttpRequestConfig<any>) {
    config.baseURL = this.baseUrl;
    config.skipSslVerify = this.skipSslVerify ?? false;
    config.logRes = false;
    config.logParams = false;
    config.headers = {
      "X-SLCE-API-TOKEN": this.apiToken,
    };
    const res = await this.ctx.http.request(config);
    if (!res.err) {
      return res.data;
    }
    throw new Error(res.msg);
  }

}

new SafelineAccess();
