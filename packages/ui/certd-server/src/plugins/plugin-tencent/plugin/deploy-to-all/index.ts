import {AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput} from '@certd/pipeline';
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { TencentSslClient } from '../../../plugin-lib/tencent/index.js';

@IsTaskPlugin({
  name: 'DeployCertToTencentAll',
  title: '腾讯云-部署证书到任意云资源',
  needPlus: false,
  icon: 'svg:icon-tencentcloud',
  group: pluginGroups.tencent.key,
  desc: '支持负载均衡、CDN、DDoS、直播、点播、Web应用防火墙、API网关、TEO、容器服务、对象存储、轻应用服务器、云原生微服务、云开发',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToTencentAll extends AbstractTaskPlugin {
  /**
   * AccessProvider的key,或者一个包含access的具体的对象
   */
  @TaskInput({
    title: 'Access授权',
    helper: 'access授权',
    component: {
      name: 'access-selector',
      type: 'tencent',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: '证书',
    helper: '请选择"证书申请任务"或“上传证书到腾讯云”前置任务的输出',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames,'UploadCertToTencent'],
    },
    required: true,
  })
  tencentCertId!: string | CertInfo;




  @TaskInput({
    title: '资源类型',
    component: {
      name: 'a-select',
      vModel: 'value',
      allowClear: true,
      //- clb
      // - cdn
      // - ddos
      // - live
      // - vod
      // - waf
      // - apigateway
      // - teo
      // - tke
      // - cos
      // - lighthouse
      // - tse
      // - tcb
      options: [
        { value: 'clb',label: '负载均衡'},
        { value: 'cdn',label: 'CDN'},
        { value: 'ddos',label: 'DDoS'},
        { value: 'live',label: '直播'},
        { value: 'vod',label: '点播'},
        { value: 'waf',label: 'Web应用防火墙'},
        { value: 'apigateway',label: 'API网关'},
        { value: 'teo',label: 'TEO'},
        { value: 'tke',label: '容器服务'},
        { value: 'cos',label: '对象存储'},
        { value: 'lighthouse',label: '轻应用服务器'},
        { value: 'tse',label: '云原生微服务'},
        { value: 'tcb',label: '云开发'},
      ]
    },
    helper: '',
    required: true,
  })
  resourceType!: string;

  @TaskInput({
    title: 'Region',
    component: {
      name: 'a-input',
      vModel: 'value',
      allowClear: true,
    },
    helper: '当云资源类型传入clb、waf、apigateway、cos、lighthouse、tke、tse、tcb 时，公共参数Region必传。[参考文档](https://cloud.tencent.com/document/product/400/91667)',
  })
  region!: string;


  @TaskInput({
    title: '云资源实例Id列表',
    component: {
      name: 'a-select',
      vModel: 'value',
      open: false,
      mode: 'tags',
    },
    helper: '[参考文档](https://cloud.tencent.com/document/product/400/91667)',
  })
  instanceIdList!: string[];

  async onInstance() {}
  async execute(): Promise<void> {
    const access = await this.getAccess(this.accessId);

    const sdk = await import('tencentcloud-sdk-nodejs/tencentcloud/services/ssl/v20191205/index.js');
    const Client = sdk.v20191205.Client;
    const client = new Client({
      credential: {
        secretId: access.secretId,
        secretKey: access.secretKey,
      },
      region: this.region,
      profile: {
        httpProfile: {
          endpoint: `ssl.${access.intlDomain()}tencentcloudapi.com`,
        },
      },
    });

    let certId:string = null
    if (typeof this.tencentCertId === 'string') {
      certId = this.tencentCertId as string;
    } else if (this.tencentCertId && typeof this.tencentCertId === 'object') {
      certId = await this.uploadToTencent(access, this.tencentCertId as CertInfo);
    } else {
      throw new Error('无效的证书输入类型');
    }

    const params = {
      CertificateId: certId,
      ResourceType: this.resourceType,
      InstanceIdList: this.instanceIdList,
      IsCache:0,
    };

    const res = await client.DeployCertificateInstance(params);
    this.checkRet(res);
    this.logger.info('部署成功,等待5s:',JSON.stringify(res));
    await this.ctx.utils.sleep(5000);
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error('执行失败：' + ret.Error.Code + ',' + ret.Error.Message);
    }
  }

  private async uploadToTencent(access: any, cert: CertInfo) {
    const sslClient = new TencentSslClient({
      access,
      logger: this.logger,
    });

    return  await sslClient.uploadToTencent({
      certName: this.appendTimeSuffix('certd'),
      cert: cert,
    });
  }
}
