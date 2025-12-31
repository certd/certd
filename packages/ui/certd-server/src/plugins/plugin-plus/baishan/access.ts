import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "baishan",
  title: "白山云授权",
  desc: "",
  icon: "material-symbols:shield-outline",
})
export class BaishanAccess extends BaseAccess {
  @AccessInput({
    title: "token",
    component: {
      placeholder: "token",
    },
    helper: "自行联系提供商申请",
    required: true,
    encrypt: true,
  })
  token = "";
}

new BaishanAccess();
