import { AccessInput, BaseAccess, IsAccess, PageSearch } from "@certd/pipeline";
import { QiniuClient } from "./lib/sdk.js";

@IsAccess({
  name: "qiniu",
  title: "七牛云授权",
  desc: "",
  icon: "svg:icon-qiniuyun",
  input: {},
  order: 2,
})
export class QiniuAccess extends BaseAccess {
  @AccessInput({
    title: "AccessKey",
    rules: [{ required: true, message: "此项必填" }],
    helper: "AK，前往[密钥管理](https://portal.qiniu.com/developer/user/key)获取",
  })
  accessKey!: string;
  @AccessInput({
    title: "SecretKey",
    encrypt: true,
    helper: "SK",
  })
  secretKey!: string;

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
    await this.getDomainList();
    return "ok";
  }

  async getDomainList(req: PageSearch = {}) {
    const qiniuClient = new QiniuClient({
      http: this.ctx.http,
      access: this,
      logger: this.ctx.logger,
    });
    const url = `https://api.qiniu.com/domain?limit=${req.pageSize || 1000}`;
    const res = await qiniuClient.doRequest(url, "get");
    return res.domains || [];
  }
}

new QiniuAccess();
