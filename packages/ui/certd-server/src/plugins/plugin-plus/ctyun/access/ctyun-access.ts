import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

@IsAccess({
  name: "ctyun",
  title: "天翼云授权",
  desc: "",
  icon: "ant-design:aliyun-outlined",
  order: 2,
})
export class CtyunAccess extends BaseAccess {
  @AccessInput({
    title: "accessKeyId",
    component: {
      placeholder: "accessKeyId",
    },
    helper: "[前往创建天翼云AccessKey](https://iam.ctyun.cn/myAccessKey)",
    required: true,
  })
  accessKeyId = "";
  @AccessInput({
    title: "securityKey",
    component: {
      placeholder: "securityKey",
    },
    required: true,
    encrypt: true,
    helper: "",
  })
  securityKey = "";
}

new CtyunAccess();
