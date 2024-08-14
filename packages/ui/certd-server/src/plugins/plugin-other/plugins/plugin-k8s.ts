import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, utils } from '@certd/pipeline';
import { CertInfo } from '@certd/plugin-cert';
import { K8sClient } from '@certd/lib-k8s';
import { K8sAccess } from '../access/index.js';
import { appendTimeSuffix } from '../../plugin-aliyun/utils/index.js';

@IsTaskPlugin({
  name: 'DeployToK8SIngress',
  title: 'K8S Ingress证书部署',
  group: pluginGroups.other.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class K8STestPlugin extends AbstractTaskPlugin {
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
    title: '保密字典Id',
    component: {
      placeholder: '保密字典Id',
    },
    required: true,
  })
  secretName!: string | string[];

  @TaskInput({
    title: 'k8s授权',
    helper: 'kubeconfig',
    component: {
      name: 'pi-access-selector',
      type: 'k8s',
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
  cert!: CertInfo;

  async onInstance() {}
  async execute(): Promise<void> {
    const access: K8sAccess = await this.accessService.getById(this.accessId);
    const k8sClient = new K8sClient({
      kubeConfigStr: access.kubeconfig,
      logger: this.logger,
    });
    await this.patchNginxCertSecret({ cert: this.cert, k8sClient });
    await utils.sleep(3000); // 停留2秒，等待secret部署完成
  }

  async patchNginxCertSecret(options: { cert: CertInfo; k8sClient: K8sClient }) {
    const { cert, k8sClient } = options;
    const crt = cert.crt;
    const key = cert.key;
    const crtBase64 = Buffer.from(crt).toString('base64');
    const keyBase64 = Buffer.from(key).toString('base64');

    const { namespace, secretName } = this;

    const body: any = {
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
      this.logger.info(`ingress cert Secret已更新:${secret}`);
    }
  }
}
new K8STestPlugin();
