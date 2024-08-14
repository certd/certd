import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, utils } from '@certd/pipeline';
import tencentcloud from 'tencentcloud-sdk-nodejs';
import { K8sClient } from '@certd/lib-k8s';
import dayjs from 'dayjs';

@IsTaskPlugin({
  name: 'DeployCertToTencentTKEIngress',
  title: '部署到腾讯云TKE-ingress',
  group: pluginGroups.tencent.key,
  desc: '需要【上传到腾讯云】作为前置任务',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToTencentTKEIngressPlugin extends AbstractTaskPlugin {
  @TaskInput({ title: '大区', value: 'ap-guangzhou', required: true })
  region!: string;

  @TaskInput({
    title: '集群ID',
    required: true,
    desc: '例如：cls-6lbj1vee',
    request: true,
  })
  clusterId!: string;

  @TaskInput({ title: '集群namespace', value: 'default', required: true })
  namespace!: string;

  @TaskInput({ title: '证书的secret名称', required: true })
  secretName!: string | string[];

  @TaskInput({ title: 'ingress名称', required: true })
  ingressName!: string | string[];

  @TaskInput({
    title: 'ingress类型',
    value: 'qcloud',
    component: {
      name: 'a-auto-complete',
      vModel: 'value',
      options: [{ value: 'qcloud' }, { value: 'nginx' }],
    },
    helper: '可选 qcloud / nginx',
  })
  ingressClass!: string;

  @TaskInput({ title: '集群内网ip', helper: '如果开启了外网的话，无需设置' })
  clusterIp!: string;

  @TaskInput({
    title: '集群域名',
    helper: '可不填，默认为:[clusterId].ccs.tencent-cloud.com',
  })
  clusterDomain!: string;
  @TaskInput({
    title: '腾讯云证书id',
    helper: '请选择“上传证书到腾讯云”前置任务的输出',
    component: {
      name: 'pi-output-selector',
      from: 'UploadCertToTencent',
    },
    required: true,
  })
  tencentCertId!: string;

  /**
   * AccessProvider的key,或者一个包含access的具体的对象
   */
  @TaskInput({
    title: 'Access授权',
    helper: 'access授权',
    component: {
      name: 'pi-access-selector',
      type: 'tencent',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'pi-output-selector',
    },
    required: true,
  })
  cert!: any;

  async onInstance() {}
  async execute(): Promise<void> {
    const accessProvider = await this.accessService.getById(this.accessId);
    const tkeClient = this.getTkeClient(accessProvider, this.region);
    const kubeConfigStr = await this.getTkeKubeConfig(tkeClient, this.clusterId);

    this.logger.info('kubeconfig已成功获取');
    const k8sClient = new K8sClient({
      kubeConfigStr,
      logger: this.logger,
    });
    if (this.clusterIp != null) {
      if (!this.clusterDomain) {
        this.clusterDomain = `${this.clusterId}.ccs.tencent-cloud.com`;
      }
      // 修改内网解析ip地址
      k8sClient.setLookup({ [this.clusterDomain]: { ip: this.clusterIp } });
    }
    const ingressType = this.ingressClass || 'qcloud';
    if (ingressType === 'qcloud') {
      await this.patchQcloudCertSecret({ k8sClient });
    } else {
      await this.patchNginxCertSecret({ k8sClient });
    }

    await utils.sleep(2000); // 停留2秒，等待secret部署完成
    await this.restartIngress({ k8sClient });
  }

  getTkeClient(accessProvider: any, region = 'ap-guangzhou') {
    const TkeClient = tencentcloud.tke.v20180525.Client;
    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region,
      profile: {
        httpProfile: {
          endpoint: 'tke.tencentcloudapi.com',
        },
      },
    };

    return new TkeClient(clientConfig);
  }

  async getTkeKubeConfig(client: any, clusterId: string) {
    // Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher
    const params = {
      ClusterId: clusterId,
    };
    const ret = await client.DescribeClusterKubeconfig(params);
    this.checkRet(ret);
    this.logger.info('注意：后续操作需要在【集群->基本信息】中开启外网或内网访问,https://console.cloud.tencent.com/tke2/cluster');
    return ret.Kubeconfig;
  }

  appendTimeSuffix(name: string) {
    if (name == null) {
      name = 'certd';
    }
    return name + '-' + dayjs().format('YYYYMMDD-HHmmss');
  }

  async patchQcloudCertSecret(options: { k8sClient: any }) {
    if (this.tencentCertId == null) {
      throw new Error('请先将【上传证书到腾讯云】作为前置任务');
    }
    this.logger.info('腾讯云证书ID:', this.tencentCertId);
    const certIdBase64 = Buffer.from(this.tencentCertId).toString('base64');

    const { namespace, secretName } = this;

    const body = {
      data: {
        qcloud_cert_id: certIdBase64,
      },
      metadata: {
        labels: {
          certd: this.appendTimeSuffix('certd'),
        },
      },
    };
    let secretNames: any = secretName;
    if (typeof secretName === 'string') {
      secretNames = [secretName];
    }
    for (const secret of secretNames) {
      await options.k8sClient.patchSecret({
        namespace,
        secretName: secret,
        body,
      });
      this.logger.info(`CertSecret已更新:${secret}`);
    }
  }

  async patchNginxCertSecret(options: { k8sClient: any }) {
    const { k8sClient } = options;
    const { cert } = this;
    const crt = cert.crt;
    const key = cert.key;
    const crtBase64 = Buffer.from(crt).toString('base64');
    const keyBase64 = Buffer.from(key).toString('base64');

    const { namespace, secretName } = this;

    const body = {
      data: {
        'tls.crt': crtBase64,
        'tls.key': keyBase64,
      },
      metadata: {
        labels: {
          certd: this.appendTimeSuffix('certd'),
        },
      },
    };
    let secretNames = secretName;
    if (typeof secretName === 'string') {
      secretNames = [secretName];
    }
    for (const secret of secretNames) {
      await k8sClient.patchSecret({ namespace, secretName: secret, body });
      this.logger.info(`CertSecret已更新:${secret}`);
    }
  }

  async restartIngress(options: { k8sClient: any }) {
    const { k8sClient } = options;
    const { namespace, ingressName } = this;

    const body = {
      metadata: {
        labels: {
          certd: this.appendTimeSuffix('certd'),
        },
      },
    };
    let ingressNames = this.ingressName;
    if (typeof ingressName === 'string') {
      ingressNames = [ingressName];
    }
    for (const ingress of ingressNames) {
      await k8sClient.patchIngress({ namespace, ingressName: ingress, body });
      this.logger.info(`ingress已重启:${ingress}`);
    }
  }
  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error('执行失败：' + ret.Error.Code + ',' + ret.Error.Message);
    }
  }
}
