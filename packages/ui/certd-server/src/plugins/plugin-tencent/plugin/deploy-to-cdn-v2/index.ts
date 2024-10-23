import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { createRemoteSelectInputDefine, TencentAccess } from '@certd/plugin-plus';
import { CertInfo } from '@certd/plugin-cert';
import { TencentSslClient } from '../../lib/index.js';

@IsTaskPlugin({
  name: 'TencentDeployCertToCDNv2',
  title: '部署到腾讯云CDN-v2',
  icon: 'svg:icon-tencentcloud',
  group: pluginGroups.tencent.key,
  desc: '推荐使用',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class TencentDeployCertToCDNv2 extends AbstractTaskPlugin {
  @TaskInput({
    title: 'Access提供者',
    helper: 'access 授权',
    component: {
      name: 'access-selector',
      type: 'tencent',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: 'CDN域名',
      helper: '请选择域名或输入域名',
      typeName: TencentDeployCertToCDNv2.name,
      action: TencentDeployCertToCDNv2.prototype.onGetDomainList.name,
    })
  )
  domains!: string | string[];

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书，或者选择前置任务“上传证书到腾讯云”任务的证书ID',
    component: {
      name: 'output-selector',
      from: ['CertApply', 'CertApplyLego', 'UploadCertToTencent'],
    },
    required: true,
  })
  cert!: CertInfo | string;

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.accessService.getById<TencentAccess>(this.accessId);
    const sslClient = new TencentSslClient({
      access,
      logger: this.logger,
    });

    let tencentCertId = this.cert as string;
    if (typeof this.cert !== 'string') {
      tencentCertId = await sslClient.uploadToTencent({
        certName: this.appendTimeSuffix('certd'),
        cert: this.cert,
      });
    }

    const res = await sslClient.deployCertificateInstance({
      CertificateId: tencentCertId,
      ResourceType: 'cdn',
      Status: 1,
      InstanceIdList: this.domains,
    });

    this.logger.info('部署成功', res);
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error('执行失败：' + ret.Error.Code + ',' + ret.Error.Message);
    }
  }

  async getCdnClient() {
    const accessProvider = await this.accessService.getById<TencentAccess>(this.accessId);
    const sdk = await import('tencentcloud-sdk-nodejs/tencentcloud/services/cdn/v20180606/index.js');
    const CdnClient = sdk.v20180606.Client;

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

  async onGetDomainList(data: any) {
    const cdnClient = await this.getCdnClient();
    const res = await cdnClient.DescribeDomains({
      Limit: 1000,
    });
    this.checkRet(res);
    return res.Domains.map((item: any) => {
      return {
        label: item.Domain,
        value: item.Domain,
      };
    });
  }
}
