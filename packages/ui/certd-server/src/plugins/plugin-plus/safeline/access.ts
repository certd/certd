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
}

new SafelineAccess();
