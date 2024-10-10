import { AbstractTaskPlugin, HttpClient, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { CertInfo } from '@certd/plugin-cert';
import { WoaiAccess } from '../access.js';

@IsTaskPlugin({
  name: 'WoaiCDN',
  title: '部署证书到我爱云 CDN',
  desc: '部署证书到我爱云CDN',
  icon: 'clarity:plugin-line',
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class WoaiCdnPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: '证书ID',
    helper: '请填写 [证书列表](https://console.edge.51vs.club/site/certificate) 中的证书的ID',
    component: { name: 'a-input' },
    required: true,
  })
  certId!: string;
  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: ['CertApply', 'CertApplyLego'],
    },
    required: true,
  })
  cert!: CertInfo;
  @TaskInput({
    title: 'Access授权',
    helper: '我爱云的用户、密码授权',
    component: {
      name: 'access-selector',
      type: 'woai',
    },
    required: true,
  })
  accessId!: string;
  http!: HttpClient;
  private readonly baseApi = 'https://console.edeg.51vs.club';

  async onInstance() {
    this.http = this.ctx.http;
  }

  private async doRequestApi(url: string, data: any = null, method = 'post', token: string | null = null) {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Token: token } : {}),
    };
    const res = await this.http.request<any, any>({
      url,
      method,
      data,
      headers,
    });
    if (res.code !== 200) {
      throw new Error(`${JSON.stringify(res.message)}`);
    }
    return res;
  }

  async execute(): Promise<void> {
    const { certId, cert, accessId } = this;
    const access = (await this.accessService.getById(accessId)) as WoaiAccess;
    // 登录获取token
    const loginResponse = await this.doRequestApi(`${this.baseApi}/account/login`, {
      username: access.username,
      password: access.password,
    });
    const token = loginResponse.data.token;
    this.logger.info('登录成功,获取到Token:', token);
    // 更新证书
    const editCertResponse = await this.doRequestApi(
      `${this.baseApi}/certificate/edit`,
      {
        id: certId,
        cert: cert.crt,
        key: cert.key,
      },
      'post',
      token
    );
    this.logger.info('证书更新成功:', editCertResponse.message);
  }
}

new WoaiCdnPlugin();
