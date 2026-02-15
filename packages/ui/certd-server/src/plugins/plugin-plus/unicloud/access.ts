import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 */
@IsAccess({
  name: "unicloud",
  title: "uniCloud",
  icon: "material-symbols:shield-outline",
  desc: "unicloud授权",
})
export class UniCloudAccess extends BaseAccess {
  @AccessInput({
    title: "账号",
    component: {
      placeholder: "email",
    },
    helper: "登录邮箱",
    required: true,
    encrypt: false,
  })
  email = "";

  @AccessInput({
    title: "密码",
    component: {
      placeholder: "密码",
    },
    required: true,
    encrypt: true,
  })
  password = "";

}

new UniCloudAccess();
