import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { utils } from "@certd/basic";

import { CertApplyPluginNames } from "@certd/plugin-cert";
import yaml from "js-yaml";

@IsTaskPlugin({
  name: "DeployCertToTencentTKEIngress",
  title: "腾讯云-部署到TKE",
  needPlus: false,
  icon: "svg:icon-tencentcloud",
  group: pluginGroups.tencent.key,
  desc: "修改TKE集群密钥配置，支持Opaque和TLS证书类型。注意：\n1. serverless集群请使用K8S部署插件；\n2. Opaque类型需要【上传到腾讯云】作为前置任务；\n3. ApiServer需要开通公网访问（或者certd可访问），实际上底层仍然是通过KubeClient进行部署",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToTencentTKEIngressPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "ingress证书类型",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "nginx", label: "TLS证书格式（Nginx可用）" },
        { value: "qcloud", label: "Opaque格式（CLB可用，原qcloud）" },
      ],
    },
    helper: "clb将部署Opaque类型的证书，nginx类型将部署TLS证书格式",
    required: true,
  })
  ingressClass!: string;

  @TaskInput({
    title: "腾讯云证书id",
    helper: "请选择“上传证书到腾讯云”前置任务的输出",
    component: {
      name: "output-selector",
      from: "UploadCertToTencent",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.ingressClass === "qcloud"|| form.ingressClass === "clb"
        })
      }
    `,
    required: true,
  })
  tencentCertId!: string;

  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.ingressClass === "nginx"
        })
      }
    `,
    required: true,
  })
  cert!: any;

  /**
   * AccessProvider的key,或者一个包含access的具体的对象
   */
  @TaskInput({
    title: "Access授权",
    helper: "access授权",
    component: {
      name: "access-selector",
      type: "tencent",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({ title: "大区", value: "ap-guangzhou", required: true })
  region!: string;

  @TaskInput({
    title: "集群ID",
    required: true,
    desc: "例如：cls-6lbj1vee",
    request: true,
  })
  clusterId!: string;

  @TaskInput({ title: "集群namespace", value: "default", required: true })
  namespace!: string;

  @TaskInput({
    title: "证书的secret名称",
    helper: "集群->配置管理->Secret,复制名称",
    required: true,
    component: {
      name: "a-select",
      vModel: "value",
      mode: "tags",
      open: false,
    },
  })
  secretName!: string | string[];

  @TaskInput({
    title: "集群域名",
    helper: "ApiServer需要开通公网访问，填写`ApiServer公网IP:443`\n默认为:[clusterId].ccs.tencent-cloud.com，可能访问不通",
    component: {
      placeholder: "xx.xxx.xx.xx:443",
    },
  })
  clusterDomain!: string;

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
  ingressName!: string | string[];

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
    helper: "如果Secret不存在，则创建",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
  })
  createOnNotFound: boolean;

  // @TaskInput({ title: "集群内网ip", helper: "如果开启了外网的话，无需设置" })
  // clusterIp!: string;

  K8sClient: any;

  async onInstance() {
    //  const TkeClient = this.tencentcloud.tke.v20180525.Client;
    const k8sSdk = await import("@certd/lib-k8s");
    this.K8sClient = k8sSdk.K8sClient;
  }

  async execute(): Promise<void> {
    const accessProvider = await this.getAccess(this.accessId);
    const tkeClient = await this.getTkeClient(accessProvider, this.region);
    let kubeConfigStr = await this.getTkeKubeConfig(tkeClient, this.clusterId);

    if (this.clusterDomain) {
      const kubeConfig = yaml.load(kubeConfigStr);
      kubeConfig.clusters[0].cluster.server = `https://${this.clusterDomain}`;
      kubeConfigStr = yaml.dump(kubeConfig);
    }

    this.logger.info("kubeconfig已成功获取");
    const k8sClient = new this.K8sClient({
      kubeConfigStr,
      logger: this.logger,
      skipTLSVerify: this.skipTLSVerify,
    });
    // if (this.clusterIp != null) {
    //   if (!this.clusterDomain) {
    //     this.clusterDomain = `${this.clusterId}.ccs.tencent-cloud.com`;
    //   }
    //   // 修改内网解析ip地址
    //   k8sClient.setLookup({ [this.clusterDomain]: { ip: this.clusterIp } });
    // }
    const ingressType = this.ingressClass || "qcloud";
    if (ingressType === "qcloud" || ingressType === "clb") {
      await this.patchQcloudCertSecret({ k8sClient });
    } else {
      await this.patchNginxCertSecret({ k8sClient });
    }
    await utils.sleep(5000); // 停留2秒，等待secret部署完成
    if (this.ingressName) {
      this.logger.info("正在重启ingress:", this.ingressName);
      await this.restartIngress({ k8sClient });
    }
  }

  async getTkeClient(accessProvider: any, region = "ap-guangzhou") {
    const sdk = await import("tencentcloud-sdk-nodejs/tencentcloud/services/tke/v20180525/index.js");
    const TkeClient = sdk.v20180525.Client;
    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region,
      profile: {
        httpProfile: {
          endpoint: `tke.${accessProvider.intlDomain()}tencentcloudapi.com`,
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
    this.logger.info("注意：后续操作需要在【集群->基本信息】中开启外网或内网访问,https://console.cloud.tencent.com/tke2/cluster");
    return ret.Kubeconfig;
  }

  async patchQcloudCertSecret(options: { k8sClient: any }) {
    if (this.tencentCertId == null) {
      throw new Error("请先将【上传证书到腾讯云】作为前置任务");
    }
    this.logger.info("腾讯云证书ID:", this.tencentCertId);
    const certIdBase64 = Buffer.from(this.tencentCertId).toString("base64");

    const { namespace, secretName } = this;

    const body = {
      data: {
        qcloud_cert_id: certIdBase64,
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
    let secretNames = secretName;
    if (typeof secretName === "string") {
      secretNames = [secretName];
    }
    for (const secret of secretNames) {
      await k8sClient.patchSecret({ namespace, secretName: secret, body, createOnNotFound: this.createOnNotFound });
      this.logger.info(`CertSecret已更新:${secret}`);
    }
  }

  async restartIngress(options: { k8sClient: any }) {
    const { k8sClient } = options;
    const { namespace, ingressName } = this;

    const body = {
      metadata: {
        labels: {
          certd: this.appendTimeSuffix("certd"),
        },
      },
    };
    let ingressNames = this.ingressName || [];
    if (typeof ingressName === "string") {
      ingressNames = [ingressName];
    }
    for (const ingress of ingressNames) {
      await k8sClient.patchIngress({ namespace, ingressName: ingress, body });
      this.logger.info(`ingress已重启:${ingress}`);
    }
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error("执行失败：" + ret.Error.Code + "," + ret.Error.Message);
    }
  }
}
