import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";
import { HttpClient } from "@certd/basic";

import { BaotaClient } from "./lib/client.js";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "baota",
  title: "baota授权",
  desc: "",
  icon: "svg:icon-bt",
  order: 2,
})
export class BaotaAccess extends BaseAccess {
  @AccessInput({
    title: "宝塔URL地址",
    component: {
      placeholder: "http://192.168.42.237:41896",
    },
    helper: "宝塔面板的url地址，不要带安全入口，例如：http://192.168.42.237:41896",
    required: true,
  })
  panelUrl = "";

  @AccessInput({
    title: "接口密钥",
    component: {
      placeholder: "接口密钥",
    },
    helper: "宝塔面板设置->面板设置->API接口->接口配置->接口密钥。\n必须要加IP白名单，您可以点击下方测试按钮，报错之后会打印IP，将IP加入白名单之后再次测试即可",
    required: true,
    encrypt: true,
  })
  apiSecret = "";

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
    title: "windows版",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "是否是windows版",
  })
  isWindows = false;

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "点击测试接口看是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    const http: HttpClient = this.ctx.http;
    const client = new BaotaClient(this, http);

    if (this.isWindows) {
      await client.doWindowsRequest("/site/get_site_types", {}, { skipCheckRes: false });
      return "ok";
    }
    const url = "/site?action=get_site_types";
    const data = {};
    await client.doRequest(url, null, data, { skipCheckRes: false });
    return "ok";
  }
}

new BaotaAccess();
