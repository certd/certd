import { AbstractAccess, IsAccess } from "@certd/pipeline";

@IsAccess({
  name: "tencent",
  title: "腾讯云",
  input: {
    secretId: {
      title: "secretId",
      component: {
        placeholder: "secretId",
      },
      rules: [{ required: true, message: "该项必填" }],
    },
    secretKey: {
      title: "secretKey",
      component: {
        placeholder: "secretKey",
      },
      rules: [{ required: true, message: "该项必填" }],
    },
  },
})
export class TencentAccess extends AbstractAccess {
  secretId = "";
  secretKey = "";
}
