import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { UpyunClient } from "./client.js";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "upyun",
  title: "又拍云",
  desc: "",
  icon: "svg:icon-upyun",
})
export class UpyunAccess extends BaseAccess {
  @AccessInput({
    title: "账号",
    component: {
      placeholder: "又拍云账号",
    },
    required: true,
  })
  username = "";
  @AccessInput({
    title: "密码",
    component: {
      placeholder: "又拍云密码",
    },
    required: true,
    encrypt: true,
  })
  password = "";

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
    await this.getCdnList();
    return "ok";
  }

  async getCdnList() {
    const upyunClient = new UpyunClient({
      access: this,
      logger: this.ctx.logger,
      http: this.ctx.http,
    });
    const cookie = await upyunClient.getLoginToken();
    const req = {
      cookie,
      url: "https://console.upyun.com/api/account/domains/?limit=1000&business_type=file&security_cdn=false&websocket=false&key=&domain=",
      method: "GET",
      data: {},
    };
    const res = await upyunClient.doRequest(req);
    const domains = res.data?.domains || [];
    return domains;
  }
}

new UpyunAccess();
