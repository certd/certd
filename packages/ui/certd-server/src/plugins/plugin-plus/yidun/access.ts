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
}

new YidunAccess();
