import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "yidunrcdn",
  title: "易盾rcdn授权",
  icon: "material-symbols:shield-outline",
  desc: "易盾CDN，每月免费30G，[注册即领](https://rhcdn.yiduncdn.com/register?code=8mn536rrzfbf8)",
})
export class YidunRcdnAccess extends BaseAccess {
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

new YidunRcdnAccess();
