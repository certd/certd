import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";
import { MaoyunClient } from "@certd/plugin-plus";

/**
 */
@IsAccess({
  name: "maoyun",
  title: "猫云授权",
  desc: "",
  icon: "svg:icon-lucky",
})
export class MaoyunAccess extends BaseAccess {
  @AccessInput({
    title: "用户名",
    component: {
      placeholder: "username/手机号/email",
      name: "a-input",
      vModel: "value",
    },
    helper: "用户名",
    required: true,
  })
  username!: string;

  @AccessInput({
    title: "password",
    component: {
      placeholder: "密码",
      component: {
        name: "a-input-password",
        vModel: "value",
      },
    },
    encrypt: true,
    helper: "密码",
    required: true,
  })
  password!: string;

  @AccessInput({
    title: "HttpProxy",
    component: {
      placeholder: "http://192.168.x.x:10811",
      component: {
        name: "a-input",
        vModel: "value",
      },
    },
    encrypt: false,
    required: false,
  })
  httpProxy!: string;

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
    const client = new MaoyunClient({
      http: this.ctx.http,
      logger: this.ctx.logger,
      access: this,
    });
    await client.login();
    const res = await client.doRequest({
      url: "/cdn/domain",
      data: {},
      params: {
        channel_type: "0,1,2",
        page: 1,
        page_size: 1000,
      },
      method: "GET",
    });
    const list = res.data || [];
    return list;
  }
}

new MaoyunAccess();
