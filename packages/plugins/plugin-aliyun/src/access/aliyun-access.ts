import { AbstractAccess, IsAccess } from "@certd/pipeline";

@IsAccess({
  name: "aliyun",
  title: "阿里云授权",
  desc: "",
  input: {
    accessKeyId: {
      title: "accessKeyId",
      component: {
        placeholder: "accessKeyId",
      },
      required: true,
    },
    accessKeySecret: {
      title: "accessKeySecret",
      component: {
        placeholder: "accessKeySecret",
      },
      required: true,
    },
  },
})
export class AliyunAccess extends AbstractAccess {
  accessKeyId = "";
  accessKeySecret = "";
}
