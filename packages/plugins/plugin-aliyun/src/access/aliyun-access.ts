import { IsAccess, IsAccessInput } from "@certd/pipeline";

@IsAccess({
  name: "aliyun",
  title: "阿里云授权",
  desc: "",
})
export class AliyunAccess {
  @IsAccessInput({
    title: "accessKeyId",
    component: {
      placeholder: "accessKeyId",
    },
    required: true,
  })
  accessKeyId = "";
  @IsAccessInput({
    title: "accessKeySecret",
    component: {
      placeholder: "accessKeySecret",
    },
    required: true,
  })
  accessKeySecret = "";
}
