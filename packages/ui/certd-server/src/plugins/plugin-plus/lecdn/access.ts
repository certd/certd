import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 */
@IsAccess({
  name: "lecdn",
  title: "LeCDN授权",
  desc: "",
  icon: "material-symbols:shield-outline",
})
export class LeCDNAccess extends BaseAccess {
  @AccessInput({
    title: "LeCDN系统网址",
    component: {
      name: "a-input",
      vModel: "value",
    },
    required: true,
    helper: "例如：http://demo.xxxx.cn",
  })
  url!: string;

  @AccessInput({
    title: "认证类型",
    component: {
      placeholder: "请选择",
      name: "a-select",
      vModel: "value",
      options: [
        { value: "token", label: "API访问令牌" },
        { value: "password", label: "账号密码(旧版本)" },
      ],
    },
    required: true,
  })
  type!: string;

  @AccessInput({
    title: "用户名",
    component: {
      placeholder: "username",
    },
    mergeScript: `
    return {
         show:ctx.compute(({form})=>{
          return form.access.type === 'password';
        })
      }
    `,
    required: true,
    encrypt: false,
  })
  username = "";

  @AccessInput({
    title: "登录密码",
    component: {
      placeholder: "password",
    },
    required: true,
    encrypt: true,
    mergeScript: `
    return {
         show:ctx.compute(({form})=>{
          return form.access.type === 'password';
        })
      }
    `,
  })
  password = "";

  @AccessInput({
    title: "Api访问令牌",
    component: {
      placeholder: "apiToken",
    },
    required: true,
    encrypt: true,
    mergeScript: `
    return {
         show:ctx.compute(({form})=>{
          return form.access.type === 'token';
        })
      }
    `,
  })
  apiToken = "";

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "点击测试接口看是否正常",
  })
  testRequest = true;

  _token: string;

  async onTestRequest() {
    await this.getCerts();
    return "ok";
  }

  async getCerts() {
    //  http://cdnadmin.kxfox.com/prod-api/certificate?current_page=1&total=3&page_size=10
    return await this.doRequest({
      url: `/prod-api/certificate`,
      method: "get",
      params: {
        current_page: 1,
        page_size: 1000,
      },
    });
  }

  async doRequest(config: any) {
    const token = await this.getToken();
    const access = this;
    const Authorization = access.type === "token" ? access.apiToken : `Bearer ${token}`;
    const res = await this.ctx.http.request({
      baseURL: access.url,
      headers: {
        Authorization,
      },
      ...config,
    });
    this.checkRes(res);
    return res.data;
  }

  async getToken() {
    if (this.type === "token") {
      return this.apiToken;
    }
    if (this._token) {
      return this._token;
    }
    // http://cdnadmin.kxfox.com/prod-api/login
    const access = this;
    const res = await this.ctx.http.request({
      url: `/prod-api/login`,
      baseURL: access.url,
      method: "post",
      data: {
        //新旧版本不一样，旧版本是username，新版本是email
        email: access.username,
        username: access.username,
        password: access.password,
      },
    });
    this.checkRes(res);
    //新旧版本不一样，旧版本是access_token，新版本是token
    const token = res.data.access_token || res.data.token;

    this._token = token;
    return token;
  }

  private checkRes(res: any) {
    if (res.code !== 0 && res.code !== 200) {
      throw new Error(res.message || JSON.stringify(res));
    }
  }
}

new LeCDNAccess();
