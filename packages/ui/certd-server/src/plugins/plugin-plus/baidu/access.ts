import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { BaiduYunCertClient } from "./client.js";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "baidu",
  title: "百度云授权",
  desc: "",
  icon: "ant-design:baidu-outlined",
  order: 2,
})
export class BaiduAccess extends BaseAccess {
  @AccessInput({
    title: "AccessKey",
    component: {
      placeholder: "AccessKey",
    },
    helper: "[百度智能云->安全认证获取](https://console.bce.baidu.com/iam/#/iam/accesslist)",
    required: true,
    encrypt: false,
  })
  accessKey = "";

  @AccessInput({
    title: "SecretKey",
    component: {
      placeholder: "SecretKey",
    },
    helper: "",
    required: true,
    encrypt: true,
  })
  secretKey = "";

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "onTestRequest",
    },
    helper: "点击测试接口看是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    const certClient = new BaiduYunCertClient({
      access: this,
      logger: this.ctx.logger,
      http: this.ctx.http,
    });

    const res = await certClient.getCertList();
    this.ctx.logger.info("测试接口返回", res);
    return "ok";
  }
}

new BaiduAccess();
