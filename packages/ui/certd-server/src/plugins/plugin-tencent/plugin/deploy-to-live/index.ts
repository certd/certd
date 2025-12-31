import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { TencentAccess } from "../../../plugin-lib/tencent/access.js";
import { TencentSslClient } from "../../../plugin-lib/tencent/index.js";

@IsTaskPlugin({
  name: 'TencentDeployCertToLive',
  title: '腾讯云-部署到腾讯云直播',
  icon: 'svg:icon-tencentcloud',
  desc: 'https://console.cloud.tencent.com/live/',
  group: pluginGroups.tencent.key,
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class TencentDeployCertToLive extends AbstractTaskPlugin {
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
      title: '直播域名',
      helper: '请选择域名或输入域名',
      typeName: 'TencentDeployCertToLive',
      action: TencentDeployCertToLive.prototype.onGetDomainList.name,
    })
  )
  domains!: string[];

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书，或者选择前置任务“上传证书到腾讯云”任务的证书ID',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames, 'UploadCertToTencent'],
    },
    required: true,
  })
  cert!: CertInfo | string;

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.getAccess<TencentAccess>(this.accessId);

    let tencentCertId = this.cert as string;
    if (typeof this.cert !== 'string') {
      const sslClient = new TencentSslClient({
        access,
        logger: this.logger,
      });
      tencentCertId = await sslClient.uploadToTencent({
        certName: this.appendTimeSuffix('certd'),
        cert: this.cert,
      });
    }

    const client = await this.getLiveClient();
    const domainNames = this.domains.map((item: any) => {
      return {
        DomainName: item,
        Status: -1,
      };
    });
    const params = {
      DomainInfos: domainNames,
      CloudCertId: tencentCertId,
    };
    const res = await client.ModifyLiveDomainCertBindings(params);
    this.checkRet(res);

    this.logger.info('部署完成', JSON.stringify(res));
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error('执行失败：' + ret.Error.Code + ',' + ret.Error.Message);
    }
  }

  async getLiveClient() {
    const accessProvider = await this.getAccess<TencentAccess>(this.accessId);
    const sdk = await import('tencentcloud-sdk-nodejs/tencentcloud/services/live/v20180801/index.js');
    const CssClient = sdk.v20180801.Client;

    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region: '',
      profile: {
        httpProfile: {
          endpoint: `live.${accessProvider.intlDomain()}tencentcloudapi.com`,
        },
      },
    };

    return new CssClient(clientConfig);
  }

  async onGetDomainList(data: any) {
    const client = await this.getLiveClient();
    const res = await client.DescribeLiveDomains({
      PageSize: 100,
    });
    this.checkRet(res);
    return res.DomainList.map((item: any) => {
      return {
        label: item.Name,
        value: item.Name,
      };
    });
  }
}
