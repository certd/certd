import { IsAccess, AccessInput } from "@certd/pipeline";

@IsAccess({
  name: "huawei",
  title: "华为云授权",
  desc: "",
})
export class HuaweiAccess {
  @AccessInput({
    title: "accessKeyId",
    component: {
      placeholder: "accessKeyId",
    },
    required: true,
  })
  accessKeyId = "";
  @AccessInput({
    title: "accessKeySecret",
    component: {
      placeholder: "accessKeySecret",
    },
    required: true,
  })
  accessKeySecret = "";
}

new HuaweiAccess();
