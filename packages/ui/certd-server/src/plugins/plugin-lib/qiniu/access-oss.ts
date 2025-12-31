import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";

@IsAccess({
  name: "qiniuoss",
  title: "七牛OSS授权",
  desc: "",
  icon: "svg:icon-qiniuyun",
  input: {},
})
export class QiniuOssAccess extends BaseAccess {
  @AccessInput({
    title: "七牛云授权",
    component: {
      name: "access-selector",
      vModel: "modelValue",
      type: "qiniu",
    },
    helper: "请选择七牛云授权",
    required: true,
  })
  accessId = "";

  @AccessInput({
    title: "Bucket",
    helper: "存储桶名称",
    required: true,
  })
  bucket = "";
}

new QiniuOssAccess();
