import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { HttpClient } from "@certd/basic";
import { OnePanelClient } from "./client.js";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "1panel",
  title: "1panel授权",
  desc: "账号和密码",
  icon: "svg:icon-onepanel",
})
export class OnePanelAccess extends BaseAccess {
  @AccessInput({
    title: "1Panel面板的url",
    component: {
      placeholder: "http://xxxx.com:1231",
    },
    helper: "不要带安全入口",
    required: true,
  })
  baseUrl = "";

  @AccessInput({
    title: "安全入口",
    component: {
      placeholder: "登录的安全入口",
    },
    encrypt: true,
    required: false,
  })
  safeEnter = "";

  @AccessInput({
    title: "授权方式",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { label: "模拟登录【不推荐】", value: "password" },
        { label: "接口密钥【推荐】", value: "apikey" },
      ],
    },
    required: true,
  })
  type = "";

  @AccessInput({
    title: "接口版本",
    value: "v1",
    component: {
      placeholder: "v1 / v2",
      name: "a-select",
      vModel: "value",
      options: [
        { label: "v1", value: "v1" },
        { label: "v2", value: "v2" },
      ],
    },
    required: true,
  })
  apiVersion = "v1";

  @AccessInput({
    title: "用户名",
    component: {
      placeholder: "username",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.access.type === 'password';
        })
      }
    `,
    required: true,
  })
  username = "";

  @AccessInput({
    title: "密码",
    component: {
      placeholder: "password",
    },
    helper: "",
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.access.type === 'password';
        })
      }
    `,
    required: true,
    encrypt: true,
  })
  password = "";

  @AccessInput({
    title: "接口密钥",
    component: {
      placeholder: "接口密钥",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.access.type === 'apikey';
        })
      }
    `,
    helper: "面板设置->API接口中获取",
    required: true,
    encrypt: true,
  })
  apiKey = "";

  @AccessInput({
    title: "忽略证书校验",
    value: true,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "如果面板的url是https，且使用的是自签名证书，则需要开启此选项，其他情况可以关闭",
  })
  skipSslVerify = true;

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "onTestRequest",
    },
    helper: "点击测试接口看是否正常\nIP需要加白名单，如果是同一台机器部署的，可以试试面板的url使用网卡docker0的ip，白名单使用172.16.0.0/12",
  })
  testRequest = true;

  async onTestRequest() {
    const http: HttpClient = this.ctx.http;
    const client = new OnePanelClient({
      logger: this.ctx.logger,
      http,
      access: this,
      utils: this.ctx.utils,
    });

    await client.doRequest({
      url: `/api/${this.apiVersion}/websites/ssl/search`,
      method: "post",
      data: {
        page: 1,
        pageSize: 1,
        order: "ascending",
        orderBy: "expire_date",
      },
    });
    return "ok";
  }
}

new OnePanelAccess();
