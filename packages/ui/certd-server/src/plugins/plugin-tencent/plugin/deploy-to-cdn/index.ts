import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { TencentAccess } from '../../access/index.js';
import { CertInfo } from '@certd/plugin-cert';

@IsTaskPlugin({
  name: 'DeployCertToTencentCDN',
  title: '部署到腾讯云CDN',
  group: pluginGroups.tencent.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployToCdnPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'pi-output-selector',
      from: 'CertApply',
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput({
    title: 'Access提供者',
    helper: 'access 授权',
    component: {
      name: 'pi-access-selector',
      type: 'tencent',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: '证书名称',
    helper: '证书上传后将以此参数作为名称前缀',
  })
  certName!: string;

  @TaskInput({
    title: 'cdn加速域名',
    rules: [{ required: true, message: '该项必填' }],
  })
  domainName!: string;

  // @TaskInput({
  //   title: "CDN接口",
  //   helper: "CDN接口端点",
  //   component: {
  //     name: "a-select",
  //     type: "tencent",
  //   },
  //   required: true,
  // })
  // endpoint!: string;

  Client: any;

  async onInstance() {
    const sdk = await import('tencentcloud-sdk-nodejs/tencentcloud/services/cdn/v20180606/index.js');
    this.Client = sdk.v20180606.Client;
  }

  async getClient() {
    const accessProvider: TencentAccess = (await this.accessService.getById(this.accessId)) as TencentAccess;

    const CdnClient = this.Client;

    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region: '',
      profile: {
        httpProfile: {
          endpoint: 'cdn.tencentcloudapi.com',
        },
      },
    };

    return new CdnClient(clientConfig);
  }

  async execute(): Promise<void> {
    const params = this.buildParams();
    await this.doRequest(params);
  }

  buildParams() {
    return {
      Https: {
        Switch: 'on',
        CertInfo: {
          Certificate: this.cert.crt,
          PrivateKey: this.cert.key,
        },
      },
      Domain: this.domainName,
    };
  }

  async doRequest(params: any) {
    const client = await this.getClient();
    const ret = await client.UpdateDomainConfig(params);
    this.checkRet(ret);
    this.logger.info('设置腾讯云CDN证书成功:', ret.RequestId);
    return ret.RequestId;
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error('执行失败：' + ret.Error.Code + ',' + ret.Error.Message);
    }
  }
}
