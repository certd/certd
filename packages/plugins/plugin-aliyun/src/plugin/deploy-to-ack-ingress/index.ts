import { AbstractPlugin, IsTask, RunStrategy, TaskInput, TaskOutput, TaskPlugin, utils } from "@certd/pipeline";
// @ts-ignore
import { ROAClient } from "@alicloud/pop-core";
import { AliyunAccess } from "../../access";
import { K8sClient } from "@certd/plugin-util";
import { appendTimeSuffix } from "../../utils";

@IsTask(() => {
  return {
    name: "DeployCertToAliyunAckIngress",
    title: "部署到阿里云AckIngress",
    input: {
      clusterId: {
        title: "集群id",
        component: {
          placeholder: "集群id",
        },
      },
      secretName: {
        title: "保密字典Id",
        component: {
          placeholder: "保密字典Id",
        },
        required: true,
      },
      regionId: {
        title: "大区",
        value: "cn-shanghai",
        component: {
          placeholder: "集群所属大区",
        },
        required: true,
      },
      namespace: {
        title: "命名空间",
        value: "default",
        component: {
          placeholder: "命名空间",
        },
        required: true,
      },
      ingressName: {
        title: "ingress名称",
        value: "",
        component: {
          placeholder: "ingress名称",
        },
        required: true,
        helper: "可以传入一个数组",
      },
      ingressClass: {
        title: "ingress类型",
        value: "nginx",
        component: {
          placeholder: "暂时只支持nginx类型",
        },
        required: true,
      },
      isPrivateIpAddress: {
        title: "是否私网ip",
        value: false,
        component: {
          placeholder: "集群连接端点是否是私网ip",
        },
        helper: "如果您当前certd运行在同一个私网下，可以选择是。",
        required: true,
      },
      cert: {
        title: "域名证书",
        helper: "请选择前置任务输出的域名证书",
        component: {
          name: "pi-output-selector",
        },
        required: true,
      },
      accessId: {
        title: "Access授权",
        helper: "阿里云授权AccessKeyId、AccessKeySecret",
        component: {
          name: "pi-access-selector",
          type: "aliyun",
        },
        required: true,
      },
    },
    output: {},
    default: {
      strategy: {
        runStrategy: RunStrategy.SkipWhenSucceed,
      },
    },
  };
})
export class DeployCertToAliyunAckIngressPlugin extends AbstractPlugin implements TaskPlugin {
  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("开始部署证书到阿里云cdn");
    const { regionId, ingressClass, clusterId, isPrivateIpAddress, cert } = input;
    const access = (await this.accessService.getById(input.accessId)) as AliyunAccess;
    const client = this.getClient(access, regionId);
    const kubeConfigStr = await this.getKubeConfig(client, clusterId, isPrivateIpAddress);

    this.logger.info("kubeconfig已成功获取");
    const k8sClient = new K8sClient(kubeConfigStr);
    const ingressType = ingressClass || "qcloud";
    if (ingressType === "qcloud") {
      throw new Error("暂未实现");
      // await this.patchQcloudCertSecret({ k8sClient, props, context })
    } else {
      await this.patchNginxCertSecret({ cert, k8sClient, input });
    }

    await utils.sleep(3000); // 停留2秒，等待secret部署完成
    // await this.restartIngress({ k8sClient, props })
    return {};
  }

  async restartIngress(options: { k8sClient: any; input: TaskInput }) {
    const { k8sClient, input } = options;
    const { namespace } = input;

    const body = {
      metadata: {
        labels: {
          certd: appendTimeSuffix("certd"),
        },
      },
    };
    const ingressList = await k8sClient.getIngressList({ namespace });
    console.log("ingressList:", ingressList);
    if (!ingressList || !ingressList.body || !ingressList.body.items) {
      return;
    }
    const ingressNames = ingressList.body.items
      .filter((item: any) => {
        if (!item.spec.tls) {
          return false;
        }
        for (const tls of item.spec.tls) {
          if (tls.secretName === input.secretName) {
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

  async patchNginxCertSecret(options: { cert: any; k8sClient: any; input: TaskInput }) {
    const { cert, k8sClient, input } = options;
    const crt = cert.crt;
    const key = cert.key;
    const crtBase64 = Buffer.from(crt).toString("base64");
    const keyBase64 = Buffer.from(key).toString("base64");

    const { namespace, secretName } = input;

    const body = {
      data: {
        "tls.crt": crtBase64,
        "tls.key": keyBase64,
      },
      metadata: {
        labels: {
          certd: appendTimeSuffix("certd"),
        },
      },
    };
    let secretNames = secretName;
    if (typeof secretName === "string") {
      secretNames = [secretName];
    }
    for (const secret of secretNames) {
      await k8sClient.patchSecret({ namespace, secretName: secret, body });
      this.logger.info(`CertSecret已更新:${secret}`);
    }
  }

  getClient(aliyunProvider: any, regionId: string) {
    return new ROAClient({
      accessKeyId: aliyunProvider.accessKeyId,
      accessKeySecret: aliyunProvider.accessKeySecret,
      endpoint: `https://cs.${regionId}.aliyuncs.com`,
      apiVersion: "2015-12-15",
    });
  }

  async getKubeConfig(client: any, clusterId: string, isPrivateIpAddress = false) {
    const httpMethod = "GET";
    const uriPath = `/k8s/${clusterId}/user_config`;
    const queries = {
      PrivateIpAddress: isPrivateIpAddress,
    };
    const body = "{}";
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
