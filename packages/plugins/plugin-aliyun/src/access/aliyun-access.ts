import { IsAccess, AccessInput } from "@certd/pipeline";

@IsAccess({
  name: "aliyun",
  title: "阿里云授权",
  desc: "",
})
export class AliyunAccess {
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

new AliyunAccess();
