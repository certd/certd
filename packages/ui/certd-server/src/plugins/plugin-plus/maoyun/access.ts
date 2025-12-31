import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 */
@IsAccess({
  name: "maoyun",
  title: "猫云授权",
  desc: "",
  icon: "svg:icon-lucky",
})
export class MaoyunAccess extends BaseAccess {
  @AccessInput({
    title: "用户名",
    component: {
      placeholder: "username/手机号/email",
      name: "a-input",
      vModel: "value",
    },
    helper: "用户名",
    required: true,
  })
  username!: string;

  @AccessInput({
    title: "password",
    component: {
      placeholder: "密码",
      component: {
        name: "a-input-password",
        vModel: "value",
      },
    },
    encrypt: true,
    helper: "密码",
    required: true,
  })
  password!: string;

  @AccessInput({
    title: "HttpProxy",
    component: {
      placeholder: "http://192.168.x.x:10811",
      component: {
        name: "a-input",
        vModel: "value",
      },
    },
    encrypt: false,
    required: false,
  })
  httpProxy!: string;
}

new MaoyunAccess();
