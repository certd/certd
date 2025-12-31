import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { utils } from "@certd/basic";
import { CertInfo } from "@certd/plugin-cert";
import { K8sAccess } from "../access.js";
import { CertApplyPluginNames } from "@certd/plugin-cert";
@IsTaskPlugin({
  name: "K8sDeployToSecret",
  title: "K8S-部署证书到Secret",
  icon: "mdi:kubernetes",
  desc: "部署证书到k8s的secret",
  needPlus: false,
  group: pluginGroups.panel.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class K8sDeployToSecretPlugin extends AbstractTaskPlugin {
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
    title: "保密字典Id",
    component: {
      name: "a-select",
      vModel: "value",
      mode: "tags",
      open: false,
    },
    helper: "原本存储证书的secret的name",
    required: true,
  })
  secretName!: string | string[];

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
    title: "ingress名称",
    required: false,
    helper: "填写之后会自动重启ingress",
    component: {
      name: "a-select",
      vModel: "value",
      mode: "tags",
      open: false,
    },
  })
  ingressName!: string[];

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

  K8sClient: any;
  async onInstance() {
    const sdk = await import("@certd/lib-k8s");
    this.K8sClient = sdk.K8sClient;
  }
  async execute(): Promise<void> {
    const access: K8sAccess = await this.getAccess(this.accessId);
    const k8sClient = new this.K8sClient({
      kubeConfigStr: access.kubeconfig,
      logger: this.logger,
      skipTLSVerify: access.skipTLSVerify,
    });
    try {
      await this.patchCertSecret({ cert: this.cert, k8sClient });
    } catch (e) {
      if (e.response?.body) {
        throw new Error(JSON.stringify(e.response.body));
      }
      throw e;
    }

    await utils.sleep(5000); // 停留2秒，等待secret部署完成
  }

  async patchCertSecret(options: { cert: CertInfo; k8sClient: any }) {
    const { cert, k8sClient } = options;
    const crt = cert.crt;
    const key = cert.key;
    const crtBase64 = Buffer.from(crt).toString("base64");
    const keyBase64 = Buffer.from(key).toString("base64");

    const { namespace, secretName } = this;

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
    let secretNames: any = secretName;
    if (typeof secretName === "string") {
      secretNames = [secretName];
    }
    for (const secret of secretNames) {
      body.metadata.name = secret;
      await k8sClient.patchSecret({ namespace, secretName: secret, body, createOnNotFound: this.createOnNotFound });
      this.logger.info(`ingress cert Secret已更新:${secret}`);
    }
    await utils.sleep(5000); // 停留5秒，等待secret部署完成
    if (this.ingressName && this.ingressName.length > 0) {
      await k8sClient.restartIngress(namespace, this.ingressName, { certd: this.appendTimeSuffix("certd") });
    }
  }
}
new K8sDeployToSecretPlugin();
