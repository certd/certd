import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "kuocaicdn",
  title: "括彩云cdn授权",
  icon: "material-symbols:shield-outline",
  desc: "括彩云CDN，每月免费30G，[注册即领](https://kuocaicdn.com/register?code=8mn536rrzfbf8)",
})
export class KuocaiCdnAccess extends BaseAccess {
  @AccessInput({
    title: "账户",
    component: {
      placeholder: "手机号",
    },
    required: true,
    encrypt: true,
  })
  username = "";

  @AccessInput({
    title: "密码",
    component: {
      placeholder: "password",
    },
    required: true,
    encrypt: true,
  })
  password = "";
}

new KuocaiCdnAccess();
