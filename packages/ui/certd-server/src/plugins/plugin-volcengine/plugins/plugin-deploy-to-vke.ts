import { utils } from "@certd/basic";
import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import { VolcengineAccess } from "../access.js";
import { VolcengineClient } from "../ve-client.js";

const regionOptions = [
  { label: "北京", value: "cn-beijing" },
  { label: "上海", value: "cn-shanghai" },
  { label: "广州", value: "cn-guangzhou" },
  { label: "香港", value: "cn-hongkong" },
  { label: "柔佛", value: "ap-southeast-1" },
  { label: "雅加达", value: "ap-southeast-3" },
];

@IsTaskPlugin({
  name: "VolcengineDeployToVKE",
  title: "火山引擎-替换VKE证书",
  icon: "svg:icon-volcengine",
  group: pluginGroups.volcengine.key,
  desc: "替换火山引擎VKE集群中的TLS Secret证书",
  needPlus: true,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class VolcengineDeployToVKE extends AbstractPlusTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "VolcengineUploadToCertCenter"],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "Access授权",
    helper: "火山引擎AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "volcengine",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "Region",
    helper: "VKE集群所在地域",
    component: {
      name: "a-select",
      options: regionOptions,
    },
    value: "cn-beijing",
    required: true,
  })
  regionId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "VKE集群",
      helper: "选择要替换证书的VKE集群，也可以手动输入集群ID",
      action: VolcengineDeployToVKE.prototype.onGetClusterList.name,
      watches: ["accessId", "regionId"],
      single: true,
      required: true,
    })
  )
  clusterId!: string;

  @TaskInput({
    title: "Kubeconfig类型",
    helper: "Public需要集群API Server已开启公网访问；Private需要Certd能访问集群私网地址",
    component: {
      name: "a-select",
      options: [
        { label: "公网", value: "Public" },
        { label: "私网", value: "Private" },
      ],
    },
    value: "Public",
    required: true,
  })
  kubeconfigType!: "Public" | "Private";

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
    title: "替换方式",
    helper: "按Ingress会自动读取spec.tls[].secretName；按Secret需要手动填写Secret名称",
    component: {
      name: "a-select",
      options: [
        { label: "按Secret替换", value: "secret" },
        { label: "按Ingress替换", value: "ingress" },
      ],
    },
    value: "secret",
    required: true,
  })
  targetType!: "ingress" | "secret";

  @TaskInput({
    title: "IngressName",
    required: true,
    helper: "根据Ingress名称查找TLS Secret并替换",
    mergeScript: `
      return {
        show: ctx.compute(({form}) => form.targetType === 'ingress'),
        required: ctx.compute(({form}) => form.targetType === 'ingress')
      }
    `,
  })
  ingressName!: string;

  @TaskInput({
    title: "Secret名称",
    required: true,
    helper: "选择要替换的Secret，可多选",
    component: {
      name: "remote-select",
      vModel: "value",
      mode: "tags",
      type: "plugin",
      action: "onGetSecretList",
      search: false,
      pager: false,
      single: false,
      watches: ["certDomains", "accessId", "regionId", "clusterId", "kubeconfigType", "namespace"],
    },
    mergeScript: `
      return {
        show: ctx.compute(({form}) => form.targetType === 'secret'),
        required: ctx.compute(({form}) => form.targetType === 'secret'),
        component: {
          form: ctx.compute(({form}) => form)
        }
      }
    `,
  })
  secretName!: string | string[];

  @TaskInput({
    title: "Secret自动创建",
    helper: "如果Secret不存在，则创建Opaque类型Secret",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
  })
  createOnNotFound!: boolean;

  @TaskInput({
    title: "忽略证书校验",
    helper: "连接Kubernetes API Server时跳过TLS校验",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
  })
  skipTLSVerify!: boolean;

  K8sClient: any;

  async onInstance() {
    const sdk = await import("@certd/lib-k8s");
    this.K8sClient = sdk.K8sClient;
  }

  async execute(): Promise<void> {
    this.logger.info("开始替换火山引擎VKE证书");
    const access = await this.getAccess<VolcengineAccess>(this.accessId);
    const vkeService = await this.getVkeService(access);

    // 上传证书到证书中心
    let certId: string;
    if (typeof this.cert !== "string") {
      const certInfo = this.cert as CertInfo;
      this.logger.info("开始上传证书到证书中心");
      const certService = await this.getCertService(access);
      certId = await certService.ImportCertificate({
        certName: this.appendTimeSuffix("certd"),
        cert: certInfo,
      });
      this.logger.info("上传证书到证书中心成功:" + certId);
    } else {
      certId = this.cert;
      this.logger.info("使用已有证书中心ID:" + certId);
    }

    const kubeconfigId = await this.createKubeconfig(vkeService);

    try {
      const kubeconfig = await this.getKubeconfig(vkeService, kubeconfigId);
      const k8sClient = new this.K8sClient({
        kubeConfigStr: kubeconfig,
        logger: this.logger,
        skipTLSVerify: this.skipTLSVerify,
      });
      const secretNames = await this.getTargetSecretNames(k8sClient);
      await this.patchCertSecret({ certId, k8sClient, secretNames });
    } catch (e) {
      if (e.response?.body) {
        throw new Error(this.formatK8sError(e.response.body));
      }
      throw e;
    } finally {
      await this.deleteKubeconfig(vkeService, kubeconfigId);
    }

    await utils.sleep(5000);
    this.logger.info("VKE证书替换完成");
  }

  private async getCertService(access: VolcengineAccess) {
    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http,
    });
    return await client.getCertCenterService();
  }

  private async getVkeService(access: VolcengineAccess) {
    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http,
    });
    return await client.getVkeService({ region: this.regionId });
  }

  private async createKubeconfig(vkeService: any) {
    const clusterId = this.getClusterId();
    const res = await vkeService.request({
      action: "CreateKubeconfig",
      method: "POST",
      body: {
        ClusterId: clusterId,
        Type: this.kubeconfigType,
        ValidDuration: 3600,
      },
    });
    const kubeconfigId = res.Result?.Id || res.Id;
    if (!kubeconfigId) {
      throw new Error(`生成VKE Kubeconfig失败：${JSON.stringify(res)}`);
    }
    this.logger.info(`已生成临时Kubeconfig:${kubeconfigId}`);
    return kubeconfigId;
  }

  private async getKubeconfig(vkeService: any, kubeconfigId: string) {
    const clusterId = this.getClusterId();
    const res = await vkeService.request({
      action: "ListKubeconfigs",
      method: "POST",
      body: {
        Filter: {
          ClusterIds: [clusterId],
          Ids: [kubeconfigId],
          Types: [this.kubeconfigType],
        },
        PageNumber: 1,
        PageSize: 10,
      },
    });
    const items = res.Result?.Items || res.Items || [];
    const item = items.find((it: any) => it.Id === kubeconfigId) || items[0];
    const kubeconfig = item?.Kubeconfig;
    if (!kubeconfig) {
      throw new Error(`获取VKE Kubeconfig失败：${JSON.stringify(res)}`);
    }
    return this.decodeKubeconfig(kubeconfig);
  }

  private async deleteKubeconfig(vkeService: any, kubeconfigId?: string) {
    if (!kubeconfigId) {
      return;
    }
    const clusterId = this.getClusterId();
    try {
      await vkeService.request({
        action: "DeleteKubeconfigs",
        method: "POST",
        body: {
          ClusterId: clusterId,
          Ids: [kubeconfigId],
        },
      });
      this.logger.info(`已删除临时Kubeconfig:${kubeconfigId}`);
    } catch (e) {
      this.logger.warn(`删除临时Kubeconfig失败:${e.message || e}`);
    }
  }

  private getClusterId() {
    if (!this.clusterId) {
      throw new Error("VKE集群ID不能为空");
    }
    return this.clusterId;
  }

  private decodeKubeconfig(kubeconfig: string) {
    const decoded = Buffer.from(kubeconfig, "base64").toString("utf8");
    if (!decoded.includes("apiVersion:") || !decoded.includes("clusters:")) {
      throw new Error("解析VKE Kubeconfig失败：接口返回的Kubeconfig不是有效的BASE64编码");
    }
    return decoded;
  }

  private formatK8sError(body: any) {
    if (body?.code === 422 && body?.message?.includes("field is immutable")) {
      const secretName = body.details?.name || "未知";
      return `Secret类型不可变：Secret ${secretName} 已是kubernetes.io/tls类型，type字段不可修改。\n请删除该Secret后重试，或选择正确的Secret。\n原始错误:${JSON.stringify(body)}`;
    }

    if (body?.code !== 403 || body?.reason !== "Forbidden") {
      return JSON.stringify(body);
    }

    const message = body.message || "";
    const user = message.match(/User "([^"]+)"/)?.[1];
    const granteeId = user?.split("-")[0];
    const resource = message.match(/resource "([^"]+)"/)?.[1] || body.details?.kind || "目标资源";
    const namespace = message.match(/namespace "([^"]+)"/)?.[1] || this.namespace;
    const userText = granteeId ? `，用户ID:${granteeId}` : "";
    return `VKE集群RBAC权限不足：当前火山引擎授权${userText}在集群:${this.getClusterId()} 的命名空间:${namespace} 没有操作 ${resource} 的权限。请在火山引擎 VKE 集群权限管理中，为该用户授予此命名空间的管理员权限，或授予包含 secrets get/create/update/patch 的自定义角色。原始错误:${JSON.stringify(
      body
    )}`;
  }

  private async getTargetSecretNames(k8sClient: any) {
    if (this.targetType === "secret") {
      if (typeof this.secretName === "string") {
        return [this.secretName];
      }
      return this.secretName || [];
    }

    const ingressList = await k8sClient.getIngressList({
      namespace: this.namespace,
    });
    const ingress = ingressList.items.find((item: any) => item.metadata.name === this.ingressName);
    if (!ingress) {
      const ingressNames = ingressList.items.map((item: any) => item.metadata.name).filter(Boolean);
      const availableText = ingressNames.length > 0 ? ingressNames.join(",") : "无";
      throw new Error(
        `Ingress不存在:${this.ingressName}（命名空间:${this.namespace}）。当前命名空间可用Ingress:${availableText}。请填写业务Ingress资源名称，不是 ingress-nginx-controller 这类控制器Service/Deployment名称；如果只想更新指定Secret，请将替换方式改为“按Secret替换”。`
      );
    }
    const secretNames = ingress.spec?.tls?.map((tls: any) => tls.secretName).filter(Boolean) || [];
    if (secretNames.length === 0) {
      throw new Error(`Ingress:${this.ingressName}（命名空间:${this.namespace}）未找到spec.tls[].secretName，请确认该Ingress已配置TLS，或改用“按Secret替换”。`);
    }
    return secretNames;
  }

  private async patchCertSecret(options: { certId: string; k8sClient: any; secretNames: string[] }) {
    const { certId, k8sClient, secretNames } = options;
    if (!secretNames || secretNames.length === 0) {
      throw new Error("Secret名称不能为空");
    }

    for (const secretName of secretNames) {
      let useTlsFormat = false;
      try {
        const res = await k8sClient.client.readNamespacedSecret(secretName, this.namespace);
        useTlsFormat = res.body?.type === "kubernetes.io/tls";
      } catch (e) {
        // Secret 不存在，将走创建逻辑
      }

      let body: any;
      if (useTlsFormat) {
        let crt: string;
        let key: string;
        if (typeof this.cert === "string") {
          const access = await this.getAccess<VolcengineAccess>(this.accessId);
          const certService = await this.getCertService(access);
          const detail = await certService.GetCertificateDetail(this.cert);
          crt = detail.CertificateChain || "";
          key = detail.PrivateKey || "";
          this.logger.info("从证书中心获取证书详情成功");
        } else {
          crt = this.cert.crt;
          key = this.cert.key;
        }
        body = {
          data: {
            "tls.crt": Buffer.from(crt).toString("base64"),
            "tls.key": Buffer.from(key).toString("base64"),
          },
          metadata: {
            labels: {
              certd: this.appendTimeSuffix("certd"),
            },
          },
        };
      } else {
        body = {
          type: "Opaque",
          data: {
            cert_id: Buffer.from(certId).toString("base64"),
            cert_source: Buffer.from("cert_center").toString("base64"),
          },
          metadata: {
            labels: {
              certd: this.appendTimeSuffix("certd"),
            },
          },
        };
      }

      body.metadata.name = secretName;
      this.logger.info("开始更新VKE Secret:" + secretName);
      await k8sClient.patchSecret({
        namespace: this.namespace,
        secretName,
        body,
        createOnNotFound: this.createOnNotFound,
      });
      this.logger.info("VKE Secret已更新:" + secretName);
    }

    if (this.targetType === "ingress" && this.ingressName) {
      await k8sClient.restartIngress(this.namespace, [this.ingressName], { certd: this.appendTimeSuffix("certd") });
    }
  }

  async onGetClusterList() {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const access = await this.getAccess<VolcengineAccess>(this.accessId);
    const service = await this.getVkeService(access);
    const res = await service.request({
      action: "ListClusters",
      method: "POST",
      body: {
        PageNumber: 1,
        PageSize: 100,
      },
    });
    const list = res.Result?.Items || res.Items || [];
    return list.map((item: any) => ({
      label: `${item.Name || item.Id}<${item.Id}>`,
      value: item.Id,
    }));
  }
  async onGetSecretList() {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    if (!this.clusterId) {
      throw new Error("请选择VKE集群");
    }
    const access = await this.getAccess<VolcengineAccess>(this.accessId);
    const vkeService = await this.getVkeService(access);
    const kubeconfigId = await this.createKubeconfig(vkeService);

    try {
      const kubeconfig = await this.getKubeconfig(vkeService, kubeconfigId);
      const k8sClient = new this.K8sClient({
        kubeConfigStr: kubeconfig,
        logger: this.logger,
        skipTLSVerify: this.skipTLSVerify,
      });
      const res = await k8sClient.getSecrets({ namespace: this.namespace || "default" });
      const list = res.body?.items || res.items || [];
      return list.map((item: any) => ({
        label: item.metadata.name,
        value: item.metadata.name,
      }));
    } finally {
      await this.deleteKubeconfig(vkeService, kubeconfigId);
    }
  }
}

new VolcengineDeployToVKE();
