import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";
import { CtyunClient } from "../lib.js";
import { HttpClient } from "@certd/basic";

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

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "点击测试接口看是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    await this.getCdnDomainList();
    return "ok";
  }

  async getCdnDomainList() {
    const http: HttpClient = this.ctx.http;
    const client = new CtyunClient({
      access: this,
      http,
      logger: this.ctx.logger,
    });

    // 008 是天翼云的CDN加速域名产品码
    const all = await client.getDomainList({ productCode: "008" });
    const list = all || [];
    return list;
  }
}

new CtyunAccess();
