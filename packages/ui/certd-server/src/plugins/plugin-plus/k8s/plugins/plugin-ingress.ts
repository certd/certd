import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { utils } from "@certd/basic";

import { CertInfo } from "@certd/plugin-cert";
import { K8sAccess } from "../access.js";
import { CertApplyPluginNames } from "@certd/plugin-cert";
@IsTaskPlugin({
  name: "K8sDeployToIngress",
  title: "K8S-Ingress 证书部署",
  icon: "mdi:kubernetes",
  desc: "部署证书到k8s的Ingress",
  needPlus: false,
  group: pluginGroups.panel.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class K8sDeployToIngressPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "命名空间",
    value: "default",
    component: {
      placeholder: "命名空间",
    },
    required: true,
  })
  namespace!: string;

  @TaskInput({
    title: "IngressName",
    required: true,
    helper: "Ingress名称，根据名称查找证书Secret，然后更新",
  })
  ingressName!: string;

  @TaskInput({
    title: "k8s授权",
    helper: "kubeconfig",
    component: {
      name: "access-selector",
      type: "k8s",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput({
    title: "Secret自动创建",
    helper: "如果Secret不存在，则创建",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
  })
  createOnNotFound: boolean;

  async execute(): Promise<void> {
    const access: K8sAccess = await this.getAccess(this.accessId);
    const sdk = await import("@certd/lib-k8s");
    const K8sClient = sdk.K8sClient;
    const k8sClient = new K8sClient({
      kubeConfigStr: access.kubeconfig,
      logger: this.logger,
      skipTLSVerify: access.skipTLSVerify,
    });

    const ingressList = await k8sClient.getIngressList({
      namespace: this.namespace,
    });
    const ingress = ingressList.items.find((ingress: any) => ingress.metadata.name === this.ingressName);
    if (!ingress) {
      throw new Error(`Ingress不存在:${this.ingressName}`);
    }
    if (!ingress.spec.tls) {
      throw new Error(`Ingress:${this.ingressName} 还未配置证书，请先手动配置好证书，创建一个Secret`);
    }
    const secretNames = ingress.spec.tls.map((tls: any) => tls.secretName);
    if (!secretNames || secretNames.length === 0) {
      throw new Error(`Ingress:${this.ingressName} 未找到证书Secret`);
    }
    await this.patchNginxCertSecret({ cert: this.cert, k8sClient, secretNames });
    await utils.sleep(5000); // 停留5秒，等待secret部署完成
  }

  async patchNginxCertSecret(options: { cert: CertInfo; k8sClient: any; secretNames: string[] }) {
    const { cert, k8sClient } = options;
    const crt = cert.crt;
    const key = cert.key;
    const crtBase64 = Buffer.from(crt).toString("base64");
    const keyBase64 = Buffer.from(key).toString("base64");

    const { namespace } = this;

    const body: any = {
      data: {
        "tls.crt": crtBase64,
        "tls.key": keyBase64,
      },
      metadata: {
        labels: {
          certd: this.appendTimeSuffix("certd"),
        },
      },
    };
    for (const secret of options.secretNames) {
      this.logger.info(`更新ingress cert Secret:${secret}`);
      await k8sClient.patchSecret({ namespace, secretName: secret, body, createOnNotFound: this.createOnNotFound });
      this.logger.info(`ingress cert Secret已更新:${secret}`);
    }
    await utils.sleep(5000); // 停留5秒，等待secret部署完成
    if (this.ingressName) {
      await k8sClient.restartIngress(namespace, [this.ingressName], { certd: this.appendTimeSuffix("certd") });
    }
  }
}
new K8sDeployToIngressPlugin();
