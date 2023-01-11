import { IsAccess, AccessInput } from "@certd/pipeline";

@IsAccess({
  name: "tencent",
  title: "腾讯云",
})
export class TencentAccess {
  @AccessInput({
    title: "secretId",
    component: {
      placeholder: "secretId",
    },
    rules: [{ required: true, message: "该项必填" }],
  })
  secretId = "";
  @AccessInput({
    title: "secretKey",
    component: {
      placeholder: "secretKey",
    },
    rules: [{ required: true, message: "该项必填" }],
  })
  secretKey = "";
}
