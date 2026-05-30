import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "yidun",
  title: "易盾DCDN授权",
  icon: "material-symbols:shield-outline",
  desc: "https://user.yiduncdn.com",
})
export class YidunAccess extends BaseAccess {
  @AccessInput({
    title: "api_key",
    component: {
      placeholder: "api_key",
    },
    helper: "http://user.yiduncdn.com/console/index.html#/account/config/api,点击开启后获取",
    required: true,
    encrypt: true,
  })
  apiKey = "";

  @AccessInput({
    title: "api_secret",
    component: {
      placeholder: "api_secret",
    },
    helper: "http://user.yiduncdn.com/console/index.html#/account/config/api,点击开启后获取",
    required: true,
    encrypt: true,
  })
  apiSecret = "";

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
    await this.getDomainList();
    return "ok";
  }

  async getDomainList() {
    const siteUrl = "http://user.yiduncdn.com/v1/sites";
    const res = await this.doRequest(siteUrl, "GET", {});
    return res.data;
  }

  async doRequest(url: string, method: string, data: any) {
    const access = this;
    const { apiKey, apiSecret } = access;
    const http = this.ctx.http;
    const res: any = await http.request({
      url,
      method,
      headers: {
        "api-key": apiKey,
        "api-secret": apiSecret,
      },
      data,
    });
    if (res.code != 0) {
      throw new Error(res.msg);
    }
    return res;
  }
}

new YidunAccess();
