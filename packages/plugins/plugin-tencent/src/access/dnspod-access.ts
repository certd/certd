import { AbstractAccess, IsAccess } from "@certd/pipeline";

@IsAccess({
  name: "dnspod",
  title: "dnspod",
  desc: "腾讯云的域名解析接口已迁移到dnspod",
  input: {
    id: {
      title: "账户id",
      component: {
        placeholder: "dnspod接口账户id",
      },
      rules: [{ required: true, message: "该项必填" }],
    },
    token: {
      title: "token",
      component: {
        placeholder: "开放接口token",
      },
      rules: [{ required: true, message: "该项必填" }],
    },
  },
})
export class DnspodAccess extends AbstractAccess {
  token = "";
  id = "";
}
