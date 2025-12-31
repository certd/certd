import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { utils } from "@certd/basic";

import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { AliyunAccess, AliyunClient } from "../../../plugin-lib/aliyun/index.js";

@IsTaskPlugin({
  name: "DeployCertToAliyunAck",
  title: "阿里云-部署到Ack",
  icon: "svg:icon-aliyun",
  desc: "部署到阿里云Ack集群Ingress等通过Secret管理证书的应用",
  group: pluginGroups.aliyun.key,
  needPlus: false,
  input: {},
  output: {},
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToAliyunAckPlugin extends AbstractTaskPlugin {
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
    helper: "阿里云授权AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "aliyun",
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
        { value: "cn-qingdao", label: "华北1（青岛）" },
        { value: "cn-beijing", label: "华北2（北京）" },
        { value: "cn-zhangjiakou", label: "华北3（张家口）" },
        { value: "cn-huhehaote", label: "华北5（呼和浩特）" },
        { value: "cn-wulanchabu", label: "华北6（乌兰察布）" },
        { value: "cn-hangzhou", label: "华东1（杭州）" },
        { value: "cn-shanghai", label: "华东2（上海）" },
        { value: "cn-shenzhen", label: "华南1（深圳）" },
        { value: "cn-guangzhou", label: "华南3（广州）" },
        { value: "ap-southeast-2", label: "澳大利亚（悉尼）" },
        { value: "ap-southeast-3", label: "马来西亚（吉隆坡）" },
        { value: "ap-northeast-1", label: "日本（东京）" },
        { value: "cn-chengdu", label: "西南1（成都）" },
        { value: "ap-southeast-1", label: "新加坡" },
        { value: "ap-southeast-5", label: "印度尼西亚（雅加达）" },
        { value: "cn-hongkong", label: "中国香港" },
        { value: "eu-central-1", label: "德国（法兰克福）" },
        { value: "us-east-1", label: "美国（弗吉尼亚）" },
        { value: "us-west-1", label: "美国（硅谷）" },
        { value: "eu-west-1", label: "英国（伦敦）" },
        { value: "me-east-1", label: "阿联酋（迪拜）" },
        //金融云
        { value: "cn-beijing-finance-1", label: "华北2 金融云（邀测）" },
        { value: "cn-hangzhou-finance", label: "华东1 金融云" },
        { value: "cn-shanghai-finance-1", label: "华东2 金融云" },
        { value: "cn-shenzhen-finance-1", label: "华南1 金融云" },
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
    title: "是否私网ip",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
      placeholder: "集群连接端点是否是私网ip",
    },
    helper: "如果您当前certd运行在同一个私网下，可以选择是。",
    required: true,
  })
  isPrivateIpAddress!: boolean;

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

  K8sClient: any;
  async onInstance() {
    const sdk = await import("@certd/lib-k8s");
    this.K8sClient = sdk.K8sClient;
  }
  async execute(): Promise<void> {
    this.logger.info("开始部署证书到阿里云Ack");
    const { regionId, clusterId, isPrivateIpAddress, cert } = this;
    const access = (await this.getAccess(this.accessId)) as AliyunAccess;
    const client = await this.getClient(access, regionId);
    const kubeConfigStr = await this.getKubeConfig(client, clusterId, isPrivateIpAddress);

    this.logger.info("kubeconfig已成功获取");
    const k8sClient = new this.K8sClient({
      kubeConfigStr,
      logger: this.logger,
      skipTLSVerify: this.skipTLSVerify,
    });
    await this.patchCertSecret({ cert, k8sClient });

    await utils.sleep(5000); // 停留5秒，等待secret部署完成

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
    this.logger.info("ingressList:", ingressList);
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
      await k8sClient.patchSecret({ namespace, secretName: secret, body });
      this.logger.info(`cert secret已更新: ${secret}`);
    }
  }

  async getClient(aliyunProvider: any, regionId: string) {
    const client = new AliyunClient({ logger: this.logger, useROAClient: true });
    await client.init({
      accessKeyId: aliyunProvider.accessKeyId,
      accessKeySecret: aliyunProvider.accessKeySecret,
      endpoint: `https://cs.${regionId}.aliyuncs.com`,
      apiVersion: "2015-12-15",
    });
    return client;
  }

  async getKubeConfig(client: any, clusterId: string, isPrivateIpAddress = false) {
    const httpMethod = "GET";
    const uriPath = `/k8s/${clusterId}/user_config`;
    const queries = {
      PrivateIpAddress: isPrivateIpAddress,
      TemporaryDurationMinutes: 15,
    };
    const body = {};
    const headers = {
      "Content-Type": "application/json",
    };
    const requestOption = {};

    try {
      const res = await client.request(httpMethod, uriPath, queries, body, headers, requestOption);
      return res.config;
    } catch (e) {
      console.error("请求出错：", e);
      throw e;
    }
  }
}

new DeployCertToAliyunAckPlugin();
