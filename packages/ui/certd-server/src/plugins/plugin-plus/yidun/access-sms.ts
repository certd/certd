import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "yfysms",
  title: "易发云短信",
  icon: "material-symbols:shield-outline",
  desc: "sms.yfyidc.cn/",
})
export class YfySmsAccess extends BaseAccess {
  @AccessInput({
    title: "KeyID",
    component: {
      placeholder: "api_key",
    },
    helper: "[获取密钥](http://sms.yfyidc.cn/user/index#)",
    required: true,
    encrypt: true,
  })
  keyId = "";

  @AccessInput({
    title: "KeySecret",
    component: {
      placeholder: "",
    },
    required: true,
    encrypt: true,
  })
  keySecret = "";
}

new YfySmsAccess();
