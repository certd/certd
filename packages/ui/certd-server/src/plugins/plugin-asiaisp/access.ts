import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { AsiaIspClient } from "./client.js";

@IsAccess({
  name: "asiaisp",
  title: "橙域网络(asia-isp)授权",
  desc: "橙域网络CDN API授权，用于部署证书到橙域CDN",
  icon: "clarity:plugin-line",
})
export class AsiaIspAccess extends BaseAccess {
  @AccessInput({
    title: "AccessKeyId",
    component: {
      placeholder: "请输入 AccessKeyId",
    },
    required: true,
  })
  accessKeyId = "";

  @AccessInput({
    title: "AccessKeySecret",
    component: {
      placeholder: "请输入 AccessKeySecret",
    },
    required: true,
    encrypt: true,
  })
  accessKeySecret = "";

  @AccessInput({
    title: "测试连接",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "点击测试接口是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    const client = await this.getClient();
    const list = await client.getCertList();
    return `连接成功，共 ${list.length} 个证书`;
  }

  async getClient() {
    return new AsiaIspClient({
      accessKeyId: this.accessKeyId,
      accessKeySecret: this.accessKeySecret,
      http: this.ctx.http,
      logger: this.ctx.logger,
    });
  }
}

new AsiaIspAccess();
