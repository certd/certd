import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { utils } from "@certd/basic";

import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { BaiduAccess } from "../access.js";
import { BaiduYunClient } from "../client.js";

@IsTaskPlugin({
  name: "DeployCertToBaiduCce",
  title: "百度云-部署到CCE",
  icon: "ant-design:cloud-outlined",
  desc: "部署到百度云CCE集群Ingress等通过Secret管理证书的应用",
  group: pluginGroups.baidu.key,
  needPlus: true,
  input: {},
  output: {},
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToBaiduCcePlugin extends AbstractTaskPlugin {
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
    title: "Access授权",
    helper: "百度云授权AccessKey、SecretKey",
    component: {
      name: "access-selector",
      type: "baidu",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "大区",
    component: {
      name: "a-auto-complete",
      vModel: "value",
      options: [
        { value: "bj", label: "北京" },
        { value: "gz", label: "广州" },
        { value: "su", label: "苏州" },
        { value: "bd", label: "保定" },
        { value: "fwh", label: "武汉" },
        { value: "hkg", label: "香港" },
        { value: "yq", label: "阳泉" },
        { value: "cd", label: "成都" },
        { value: "nj", label: "南京" },
      ],
      placeholder: "集群所属大区",
    },
    required: true,
  })
  regionId!: string;

  @TaskInput({
    title: "集群id",
    component: {
      placeholder: "集群id",
    },
    required: true,
  })
  clusterId!: string;

  @TaskInput({
    title: "保密字典Id",
    component: {
      placeholder: "保密字典Id",
    },
    helper: "原本存储证书的secret的name",
    required: true,
  })
  secretName!: string | string[];

  @TaskInput({
    title: "命名空间",
    value: "default",
    component: {
      placeholder: "命名空间",
    },
    required: true,
  })
  namespace = "default";

  @TaskInput({
    title: "Kubeconfig类型",
    value: "public",
    component: {
      name: "a-auto-complete",
      vModel: "value",
      options: [
        { value: "vpc", label: "VPC私网IP (BLB VPCIP)" },
        { value: "public", label: "公网IP (BLB EIP)" },
      ],
      placeholder: "选择集群连接端点类型",
    },
    helper: "VPC类型使用私网IP连接，需要certd运行在同一网络环境；public类型使用公网IP连接",
    required: true,
  })
  kubeconfigType!: string;

  @TaskInput({
    title: "忽略证书校验",
    required: false,
    helper: "是否忽略证书校验",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
  })
  skipTLSVerify!: boolean;

  @TaskInput({
    title: "Secret自动创建",
    helper: "如果Secret不存在，则创建，百度云的自动创建secret有问题",
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
    this.logger.info("开始部署证书到百度云CCE");
    const { regionId, clusterId, kubeconfigType, cert } = this;
    const access = (await this.getAccess(this.accessId)) as BaiduAccess;
    const client = new BaiduYunClient({
      access,
      logger: this.logger,
      http: this.ctx.http,
    });
    const kubeConfigStr = await this.getKubeConfig(client, clusterId, regionId, kubeconfigType);

    this.logger.info("kubeconfig已成功获取");
    const k8sClient = new this.K8sClient({
      kubeConfigStr,
      logger: this.logger,
      skipTLSVerify: this.skipTLSVerify,
    });
    await this.patchCertSecret({ cert, k8sClient });

    await utils.sleep(5000);

    try {
      await this.restartIngress({ k8sClient });
    } catch (e) {
      this.logger.warn(`重启ingress失败:${e.message}`);
    }
  }

  async restartIngress(options: { k8sClient: any }) {
    const { k8sClient } = options;
    const { namespace } = this;

    const body = {
      metadata: {
        labels: {
          certd: this.appendTimeSuffix("certd"),
        },
      },
    };
    const ingressList = await k8sClient.getIngressList({ namespace });
    this.logger.info("ingressList:", JSON.stringify(ingressList));
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
      await k8sClient.patchIngress({ namespace, ingressName: ingress, body, createOnNotFound: this.createOnNotFound });
      this.logger.info(`ingress已重启:${ingress}`);
    }
  }

  async patchCertSecret(options: { cert: CertInfo; k8sClient: any }) {
    const { cert, k8sClient } = options;
    const crt = cert.crt;
    const key = cert.key;
    const crtBase64 = Buffer.from(crt).toString("base64");
    const keyBase64 = Buffer.from(key).toString("base64");

    const { namespace, secretName } = this;

    const body = {
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
      await k8sClient.patchSecret({ namespace, secretName: secret, body ,createOnNotFound: this.createOnNotFound});
      this.logger.info(`cert secret已更新: ${secret}`);
    }
  }

  async getKubeConfig(client: BaiduYunClient, clusterId: string, regionId: string, kubeconfigType: string) {
    const res = await client.doRequest({
      host: `cce.${regionId}.baidubce.com`,
      uri: `/v2/kubeconfig/${clusterId}/${kubeconfigType}`,
      method: "get",
    });
    return res.kubeConfig;
  }
}

new DeployCertToBaiduCcePlugin();