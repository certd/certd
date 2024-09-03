import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, utils } from '@certd/pipeline';
import { AliyunAccess } from '@certd/plugin-plus';
import { appendTimeSuffix } from '../../utils/index.js';
import { CertInfo } from '@certd/plugin-cert';

@IsTaskPlugin({
  name: 'DeployCertToAliyunAckIngress',
  title: '部署到阿里云AckIngress',
  group: pluginGroups.aliyun.key,
  input: {},
  output: {},
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToAliyunAckIngressPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: '集群id',
    component: {
      placeholder: '集群id',
    },
  })
  clusterId!: string;

  @TaskInput({
    title: '保密字典Id',
    component: {
      placeholder: '保密字典Id',
    },
    required: true,
  })
  secretName!: string | string[];

  @TaskInput({
    title: '大区',
    value: 'cn-shanghai',
    component: {
      placeholder: '集群所属大区',
    },
    required: true,
  })
  regionId!: string;

  @TaskInput({
    title: '命名空间',
    value: 'default',
    component: {
      placeholder: '命名空间',
    },
    required: true,
  })
  namespace!: string;
  @TaskInput({
    title: 'ingress名称',
    value: '',
    component: {
      placeholder: 'ingress名称',
    },
    required: true,
    helper: '可以传入一个数组',
  })
  ingressName!: string;
  @TaskInput({
    title: 'ingress类型',
    value: 'nginx',
    component: {
      placeholder: '暂时只支持nginx类型',
    },
    required: true,
  })
  ingressClass!: string;
  @TaskInput({
    title: '是否私网ip',
    value: false,
    component: {
      name: 'a-switch',
      vModel: 'checked',
      placeholder: '集群连接端点是否是私网ip',
    },
    helper: '如果您当前certd运行在同一个私网下，可以选择是。',
    required: true,
  })
  isPrivateIpAddress!: boolean;
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
    title: 'Access授权',
    helper: '阿里云授权AccessKeyId、AccessKeySecret',
    component: {
      name: 'pi-access-selector',
      type: 'aliyun',
    },
    required: true,
  })
  accessId!: string;
  K8sClient: any;
  async onInstance() {
    const sdk = await import('@certd/lib-k8s');
    this.K8sClient = sdk.K8sClient;
  }
  async execute(): Promise<void> {
    this.logger.info('开始部署证书到阿里云cdn');
    const { regionId, ingressClass, clusterId, isPrivateIpAddress, cert } = this;
    const access = (await this.accessService.getById(this.accessId)) as AliyunAccess;
    const client = await this.getClient(access, regionId);
    const kubeConfigStr = await this.getKubeConfig(client, clusterId, isPrivateIpAddress);

    this.logger.info('kubeconfig已成功获取');
    const k8sClient = new this.K8sClient({
      kubeConfigStr,
      logger: this.logger,
    });
    const ingressType = ingressClass || 'qcloud';
    if (ingressType === 'qcloud') {
      throw new Error('暂未实现');
      // await this.patchQcloudCertSecret({ k8sClient, props, context })
    } else {
      await this.patchNginxCertSecret({ cert, k8sClient });
    }

    await utils.sleep(3000); // 停留2秒，等待secret部署完成
    // await this.restartIngress({ k8sClient, props })
  }

  async restartIngress(options: { k8sClient: any }) {
    const { k8sClient } = options;
    const { namespace } = this;

    const body = {
      metadata: {
        labels: {
          certd: appendTimeSuffix('certd'),
        },
      },
    };
    const ingressList = await k8sClient.getIngressList({ namespace });
    this.logger.info('ingressList:', ingressList);
    if (!ingressList || !ingressList.items) {
      return;
    }
    const ingressNames = ingressList.items
      .filter((item: any) => {
        if (!item.spec.tls) {
          return false;
        }
        for (const tls of item.spec.tls) {
          if (tls.secretName === this.secretName) {
            return true;
          }
        }
        return false;
      })
      .map((item: any) => {
        return item.metadata.name;
      });
    for (const ingress of ingressNames) {
      await k8sClient.patchIngress({ namespace, ingressName: ingress, body });
      this.logger.info(`ingress已重启:${ingress}`);
    }
  }

  async patchNginxCertSecret(options: { cert: CertInfo; k8sClient: any }) {
    const { cert, k8sClient } = options;
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
          certd: appendTimeSuffix('certd'),
        },
      },
    };
    let secretNames: any = secretName;
    if (typeof secretName === 'string') {
      secretNames = [secretName];
    }
    for (const secret of secretNames) {
      await k8sClient.patchSecret({ namespace, secretName: secret, body });
      this.logger.info(`CertSecret已更新:${secret}`);
    }
  }

  async getClient(aliyunProvider: any, regionId: string) {
    const Core = await import('@alicloud/pop-core');

    return new Core.default({
      accessKeyId: aliyunProvider.accessKeyId,
      accessKeySecret: aliyunProvider.accessKeySecret,
      endpoint: `https://cs.${regionId}.aliyuncs.com`,
      apiVersion: '2015-12-15',
    });
  }

  async getKubeConfig(client: any, clusterId: string, isPrivateIpAddress = false) {
    const httpMethod = 'GET';
    const uriPath = `/k8s/${clusterId}/user_config`;
    const queries = {
      PrivateIpAddress: isPrivateIpAddress,
    };
    const body = '{}';
    const headers = {
      'Content-Type': 'application/json',
    };
    const requestOption = {};

    try {
      const res = await client.request(httpMethod, uriPath, queries, body, headers, requestOption);
      return res.config;
    } catch (e) {
      console.error('请求出错：', e);
      throw e;
    }
  }
}

new DeployCertToAliyunAckIngressPlugin();
