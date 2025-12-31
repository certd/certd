import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { HttpRequestConfig } from "@certd/basic";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "cdnfly",
  title: "cdnfly授权",
  desc: "",
  icon: "majesticons:cloud-line",
})
export class CdnflyAccess extends BaseAccess {
  @AccessInput({
    title: "cdnfly系统网址",
    component: {
      name: "a-input",
      vModel: "value",
    },
    required: true,
    helper: "例如：http://demo.cdnfly.cn",
  })
  url!: string;

  @AccessInput({
    title: "授权方式",
    value: "apikey",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { label: "接口密钥", value: "apikey" },
        { label: "模拟登录", value: "password" },
      ],
    },
    required: true,
  })
  type = "apikey";

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
    title: "api_key",
    component: {
      placeholder: "api_key",
    },
    helper: "登录cdnfly控制台->账户中心->Api密钥,点击开启后获取",
    required: true,
    encrypt: true,
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.access.type === 'apikey';
        })
      }
    `,
  })
  apiKey = "";

  @AccessInput({
    title: "api_secret",
    component: {
      placeholder: "api_secret",
    },
    helper: "登录cdnfly控制台->账户中心->Api密钥,点击开启后获取",
    required: true,
    encrypt: true,
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.access.type === 'apikey';
        })
      }
    `,
  })
  apiSecret = "";

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "onTestRequest",
    },
    helper: "点击测试接口看是否正常\nIP需要加白名单，如果是同一台机器部署的，可以试试面板的url使用网卡docker0的ip，白名单使用172.16.0.0/12",
  })
  testRequest = true;

  accessToken!: string;
  async onTestRequest() {
    const certUrl = `/v1/certs`;
    const query: any = {
      limit: 100,
    };
    await this.doRequest({
      url: certUrl,
      method: "GET",
      data: query,
    });
    return "ok";
  }

  async getToken() {
    if (this.type !== "password") {
      throw new Error("only support password type");
    }
    if (this.accessToken) {
      return this.accessToken;
    }

    const res = await this.ctx.http.request({
      url: "/v1/login",
      baseURL: this.url,
      method: "POST",
      data: {
        account: this.username,
        password: this.password,
      },
    });
    if (res.code != 0) {
      throw new Error(res.msg);
    }
    this.accessToken = res.data.access_token;
    return this.accessToken;
  }

  async doRequest(config?: HttpRequestConfig) {
    const http = this.ctx.http;

    let headers: any = {};
    if (this.type === "password") {
      //模拟登陆
      await this.getToken();
      headers = {
        "Access-Token": `${this.accessToken}`,
      };
    } else {
      const { apiKey, apiSecret } = this;
      headers = {
        "api-key": apiKey,
        "api-secret": apiSecret,
      };
    }
    const data = config.data;
    const method = config.method || "POST";
    const baseURL = config.baseURL || this.url;
    if (!baseURL) {
      throw new Error("请配置授权内的url参数");
    }
    const res: any = await http.request({
      url: config.url,
      baseURL: baseURL,
      method: method,
      headers,
      logRes: false,
      params: method === "GET" ? data : {},
      data: method !== "GET" ? data : undefined,
    });
    if (res.code != 0) {
      throw new Error(res.msg);
    }
    return res;
  }
}

new CdnflyAccess();
