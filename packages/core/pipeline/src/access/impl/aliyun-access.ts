import { IsAccess } from "../api";
import { AbstractAccess } from "../abstract-access";

@IsAccess({
  name: "aliyun",
  title: "阿里云授权",
  desc: "",
  input: {
    accessKeyId: {
      component: {
        placeholder: "accessKeyId",
      },
      //required: true,
      //rules: [{ required: true, message: "必填项" }],
    },
  },
})
export class AliyunAccess extends AbstractAccess {
  accessKeyId = "";
  accessKeySecret = "";
}
