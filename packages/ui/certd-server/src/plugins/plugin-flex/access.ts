import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";
import { HttpClient } from "@certd/basic";
import { FlexCDNClient } from "./client.js";

/**
 */
@IsAccess({
  name: "flexcdn",
  title: "FlexCDN授权",
  desc: "",
  icon: "svg:icon-lucky",
})
export class FlexCDNAccess extends BaseAccess {
  @AccessInput({
    title: "接口地址",
    component: {
      placeholder: "http://xxxxxxx:8080",
      name: "a-input",
      vModel: "value",
    },
    required: true,
  })
  endpoint!: string;

  @AccessInput({
    title: "用户类型",
    component: {
      placeholder: "请选择",
      name: "a-select",
      vModel: "value",
      options: [
        {
          value: "user",
          label: "普通用户",
        },
        {
          value: "admin",
          label: "管理员",
        },
      ],
    },
    required: true,
  })
  type!: string;

  @AccessInput({
    title: "accessKeyId",
    component: {
      placeholder: "accessKeyId",
      component: {
        name: "a-input",
        vModel: "value",
      },
    },
    encrypt: false,
    required: true,
  })
  accessKeyId!: string;

  @AccessInput({
    title: "accessKey",
    component: {
      placeholder: "accessKey",
      component: {
        name: "a-input",
        vModel: "value",
      },
    },
    encrypt: true,
    required: true,
  })
  accessKey!: string;

  @AccessInput({
    title: "忽略证书校验",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    encrypt: false,
    required: true,
    value: false,
  })
  skipSslVerify!: boolean;

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
    const http: HttpClient = this.ctx.http;
    const client = new FlexCDNClient({
      logger: this.ctx.logger,
      http,
      access: this,
    });
    const token = await client.getToken();
    if (token) {
      return "ok";
    }
    throw "测试失败，未知错误";
  }
}

new FlexCDNAccess();
