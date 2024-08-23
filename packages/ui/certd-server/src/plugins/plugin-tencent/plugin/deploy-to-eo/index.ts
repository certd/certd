import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import tencentcloud from 'tencentcloud-sdk-nodejs-teo';
import { TencentAccess } from '../../access/index.js';

@IsTaskPlugin({
  name: 'DeployCertToTencentEO',
  title: '部署到腾讯云EO',
  desc: '腾讯云边缘安全加速平台EO，必须配置上传证书到腾讯云任务',
  group: pluginGroups.tencent.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployToEOPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: '已上传证书ID',
    helper: '请选择前置任务上传到腾讯云的证书',
    component: {
      name: 'pi-output-selector',
      from: 'UploadCertToTencent',
    },
    required: true,
  })
  certId!: string;

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
    title: '站点ID',
    helper: '类似于zone-xxxx的字符串，在站点概览页面左上角，或者，站点列表页面站点名称下方',
  })
  zoneId!: string;

  @TaskInput({
    title: '证书名称',
    helper: '证书上传后将以此参数作为名称前缀',
  })
  certName!: string;

  @TaskInput({
    title: 'cdn加速域名',
    component: {
      name: 'a-select',
      vModel: 'value',
      mode: 'tags',
      open: false,
    },
    helper: '支持多个域名',
    rules: [{ required: true, message: '该项必填' }],
  })
  domainNames!: string[];

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

  async onInstance() {}

  async execute(): Promise<void> {
    const accessProvider: TencentAccess = (await this.accessService.getById(this.accessId)) as TencentAccess;
    const client = this.getClient(accessProvider);
    const params = this.buildParams();
    await this.doRequest(client, params);
  }

  getClient(accessProvider: TencentAccess) {
    const TeoClient = tencentcloud.teo.v20220901.Client;

    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region: '',
      profile: {
        httpProfile: {
          endpoint: 'teo.tencentcloudapi.com',
        },
      },
    };

    return new TeoClient(clientConfig);
  }

  buildParams() {
    return {
      ZoneId: this.zoneId,
      Hosts: this.domainNames,
      Mode: 'sslcert',
      ServerCertInfo: [
        {
          CertId: this.certId,
        },
      ],
    };
  }

  async doRequest(client: any, params: any) {
    const ret = await client.ModifyHostsCertificate(params);
    this.checkRet(ret);
    this.logger.info('设置腾讯云EO证书成功:', ret.RequestId);
    return ret.RequestId;
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error('执行失败：' + ret.Error.Code + ',' + ret.Error.Message);
    }
  }
}
