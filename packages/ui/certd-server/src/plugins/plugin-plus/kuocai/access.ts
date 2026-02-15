import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "kuocaicdn",
  title: "括彩云cdn授权",
  icon: "material-symbols:shield-outline",
  desc: "括彩云CDN，每月免费30G，[注册即领](https://kuocaicdn.com/register?code=8mn536rrzfbf8)",
})
export class KuocaiCdnAccess extends BaseAccess {
  @AccessInput({
    title: "账户",
    component: {
      placeholder: "手机号",
    },
    required: true,
    encrypt: true,
  })
  username = "";

  @AccessInput({
    title: "密码",
    component: {
      placeholder: "password",
    },
    required: true,
    encrypt: true,
  })
  password = "";

  

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
    const loginRes = await this.getLoginToken();
    await this.getDomainList(loginRes);
    return "ok";
  } 

  
  async getLoginToken() {
    const url = "https://kuocaicdn.com/login/loginUser";
    const data = {
      userAccount: this.username,
      userPwd: this.password,
      remember: true,
    };
    const http = this.ctx.http;
    const res: any = await http.request({
      url,
      method: "POST",
      data,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      returnOriginRes: true,
    });
    if (!res.data?.success) {
      throw new Error(res.data?.message);
    }

    const jsessionId = this.ctx.utils.request.getCookie(res, "JSESSIONID");
    const token = res.data?.data;
    return {
      jsessionId,
      token,
    };
  }

  async getDomainList(loginRes: any) {
    const url = "https://kuocaicdn.com/CdnDomain/queryForDatatables";
    const data = {
      draw: 1,
      start: 0,
      length: 1000,
      search: {
        value: "",
        regex: false,
      },
    };

    const res = await this.doRequest(url, loginRes, data);
    return res.data?.data;
  }

  async doRequest(url: string, loginRes: any, data: any) {
    const http = this.ctx.http;
    const res: any = await http.request({
      url,
      method: "POST",
      headers: {
        Cookie: `JSESSIONID=${loginRes.jsessionId};kuocai_cdn_token=${loginRes.token}`,
      },
      data,
    });
    if (!res.success) {
      throw new Error(res.message);
    }
    return res;
  }
  
}

new KuocaiCdnAccess();
