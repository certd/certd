import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";
import { UniCloudClient } from "@certd/plugin-plus";

/**
 */
@IsAccess({
  name: "unicloud",
  title: "uniCloud",
  icon: "material-symbols:shield-outline",
  desc: "unicloud授权",
})
export class UniCloudAccess extends BaseAccess {
  @AccessInput({
    title: "账号",
    component: {
      placeholder: "email",
    },
    helper: "登录邮箱",
    required: true,
    encrypt: false,
  })
  email = "";

  @AccessInput({
    title: "密码",
    component: {
      placeholder: "密码",
    },
    required: true,
    encrypt: true,
  })
  password = "";

  // await this.getToken();

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
    const client = new UniCloudClient({
      access: this,
      logger: this.ctx.logger,
      http: this.ctx.http,
    });
    await client.getToken();
    return "ok";
  }
}

new UniCloudAccess();
