import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { AliyunClientV2 } from "../lib/aliyun-client-v2.js";
@IsAccess({
  name: "aliyun",
  title: "阿里云授权",
  desc: "",
  icon: "ant-design:aliyun-outlined",
  order: 0,
})
export class AliyunAccess extends BaseAccess {
  @AccessInput({
    title: "accessKeyId",
    component: {
      placeholder: "accessKeyId",
    },
    helper: "登录阿里云控制台->AccessKey管理页面获取。",
    required: true,
  })
  accessKeyId = "";
  @AccessInput({
    title: "accessKeySecret",
    component: {
      placeholder: "accessKeySecret",
    },
    required: true,
    encrypt: true,
    helper: "注意：证书申请需要dns解析权限；其他阿里云插件，需要对应的权限，比如证书上传需要证书管理权限；嫌麻烦就用主账号的全量权限的accessKey",
  })
  accessKeySecret = "";

  getClient(endpoint: string) {
    return new AliyunClientV2({
      access: this,
      logger: this.ctx.logger,
      endpoint: endpoint,
    });
  }
}

new AliyunAccess();
