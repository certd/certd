import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { CertInfo } from '@certd/plugin-cert';
import { WoaiAccess } from '../access.js';
import { CertApplyPluginNames} from '@certd/plugin-cert';
@IsTaskPlugin({
  name: 'WoaiCDN',
  title: '我爱云-部署证书到我爱云CDN',
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
    title: '接口地址(可留空)',
    helper: '请填写我爱云的地址, 默认为 [API](https://console.edge.ttzi.cn) 末尾请不要携带`/`',
    component: { name: 'a-input' },
    required: false,
  })
  baseApi?: string;
  @TaskInput({
    title: '证书ID',
    helper: '请填写 [证书列表](https://console.edge.ttzi.cn/site/certificate) 中的证书的ID',
    component: { name: 'a-input' },
    required: true,
  })
  certId!: string;
  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames],
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

  async onInstance() {}

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
    const { baseApi, certId, cert, accessId } = this;
    const access = (await this.getAccess(accessId)) as WoaiAccess;
    // 使用默认值或用户输入的值
    const apiBase = baseApi || 'https://console.edge.ttzi.cn';
    // 登录获取token
    const loginResponse = await this.doRequestApi(`${apiBase}/login`, {
      username: access.username,
      password: access.password,
    });
    const token = loginResponse.data.token;
    this.logger.info('登录成功,获取到Token:', token);
    // 更新证书
    const editCertResponse = await this.doRequestApi(
      `${apiBase}/certificate/edit`,
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
