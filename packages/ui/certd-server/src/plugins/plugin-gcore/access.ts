import { AccessInput, BaseAccess, IsAccess } from '@certd/pipeline';

@IsAccess({
  name: 'Gcore',
  title: 'Gcore',
  desc: 'Gcore',
  icon: 'clarity:plugin-line',
})
export class GcoreAccess extends BaseAccess {
  @AccessInput({
    title: 'username',
    component: {
      placeholder: 'username',
    },
    required: true,
  })
  username = '';
  @AccessInput({
    title: 'password',
    component: {
      placeholder: 'password',
    },
    required: true,
    encrypt: true,
  })
  password = '';
  @AccessInput({
    title: 'totp key',
    component: {
      placeholder: 'totp key',
    },
    encrypt: true,
  })
  otpkey = '';



  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "点击测试接口是否正常"
  })
  testRequest = true;

  async onTestRequest() {
    await this.login();
    return "ok"
  }

  async login() {
    let otp = null;
    if (this.otpkey) {
      const response = await this.ctx.http.request<any, any>({
        url: `https://cn-api.my-api.cn/api/totp/?key=${this.otpkey}`,
        method: 'get',
      });
      otp = response;
      this.ctx.logger.info('获取到otp:', otp);
    }
    const loginResponse = await this.doRequestApi(`/iam/auth/jwt/login`, {
      username: this.username,
      password: this.password,
      ...(otp && { otp }),
    });
    const token = loginResponse.access;
    this.ctx.logger.info('Token 获取成功');
    return token;
  }

  async doRequestApi(url: string, data: any = null, method = 'post', token: string | null = null) {
    const baseApi = 'https://api.gcore.com';
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
    const res = await this.ctx.http.request<any, any>({
      url,
      baseURL: baseApi,
      method,
      data,
      headers,
    });

    return res;
  }
}

new GcoreAccess();
