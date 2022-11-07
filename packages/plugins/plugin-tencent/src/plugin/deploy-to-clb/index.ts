import { AbstractPlugin, IsTask, RunStrategy, TaskInput, TaskOutput, TaskPlugin, utils } from "@certd/pipeline";
import tencentcloud from "tencentcloud-sdk-nodejs/index";
import { TencentAccess } from "../../access";
import dayjs from "dayjs";

@IsTask(() => {
  return {
    name: "DeployCertToTencentCLB",
    title: "部署到腾讯云CLB",
    desc: "暂时只支持单向认证证书，暂时只支持通用负载均衡",
    input: {
      region: {
        title: "大区",
        value: "ap-guangzhou",
        component: {
          name: "a-select",
          options: [{ value: "ap-guangzhou" }],
        },
        required: true,
      },
      domain: {
        title: "域名",
        required: true,
        helper: "要更新的支持https的负载均衡的域名",
      },
      loadBalancerId: {
        title: "负载均衡ID",
        helper: "如果没有配置，则根据域名匹配负载均衡下的监听器（根据域名匹配时暂时只支持前100个）",
        required: true,
      },
      listenerId: {
        title: "监听器ID",
        helper: "如果没有配置，则根据域名或负载均衡id匹配监听器",
      },
      certName: {
        title: "证书名称前缀",
      },
      accessId: {
        title: "Access提供者",
        helper: "access授权",
        component: {
          name: "pi-access-selector",
          type: "tencent",
        },
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
    },
    default: {
      strategy: {
        runStrategy: RunStrategy.SkipWhenSucceed,
      },
    },
    output: {},
  };
})
export class DeployToClbPlugin extends AbstractPlugin implements TaskPlugin {
  async execute(input: TaskInput): Promise<TaskOutput> {
    const { accessId, region, domain } = input;
    const accessProvider = (await this.accessService.getById(accessId)) as TencentAccess;
    const client = this.getClient(accessProvider, region);

    const lastCertId = await this.getCertIdFromProps(client, input);
    if (!domain) {
      await this.updateListener(client, input);
    } else {
      await this.updateByDomainAttr(client, input);
    }

    try {
      await utils.sleep(2000);
      let newCertId = await this.getCertIdFromProps(client, input);
      if ((lastCertId && newCertId === lastCertId) || (!lastCertId && !newCertId)) {
        await utils.sleep(2000);
        newCertId = await this.getCertIdFromProps(client, input);
      }
      if (newCertId === lastCertId) {
        return {};
      }
      this.logger.info("腾讯云证书ID:", newCertId);
    } catch (e) {
      this.logger.warn("查询腾讯云证书失败", e);
    }
    return {};
  }

  async getCertIdFromProps(client: any, input: TaskInput) {
    const listenerRet = await this.getListenerList(client, input.loadBalancerId, [input.listenerId]);
    return this.getCertIdFromListener(listenerRet[0], input.domain);
  }

  getCertIdFromListener(listener: any, domain: string) {
    let certId;
    if (!domain) {
      certId = listener.Certificate.CertId;
    } else {
      if (listener.Rules && listener.Rules.length > 0) {
        for (const rule of listener.Rules) {
          if (rule.Domain === domain) {
            if (rule.Certificate != null) {
              certId = rule.Certificate.CertId;
            }
            break;
          }
        }
      }
    }
    return certId;
  }

  async updateListener(client: any, props: TaskInput) {
    const params = this.buildProps(props);
    const ret = await client.ModifyListener(params);
    this.checkRet(ret);
    this.logger.info("设置腾讯云CLB证书成功:", ret.RequestId, "->loadBalancerId:", props.loadBalancerId, "listenerId", props.listenerId);
    return ret;
  }

  async updateByDomainAttr(client: any, props: TaskInput) {
    const params: any = this.buildProps(props);
    params.Domain = props.domain;
    const ret = await client.ModifyDomainAttributes(params);
    this.checkRet(ret);
    this.logger.info(
      "设置腾讯云CLB证书(sni)成功:",
      ret.RequestId,
      "->loadBalancerId:",
      props.loadBalancerId,
      "listenerId",
      props.listenerId,
      "domain:",
      props.domain
    );
    return ret;
  }
  appendTimeSuffix(name: string) {
    if (name == null) {
      name = "certd";
    }
    return name + "-" + dayjs().format("YYYYMMDD-HHmmss");
  }
  buildProps(props: TaskInput) {
    const { certName, cert } = props;
    return {
      Certificate: {
        SSLMode: "UNIDIRECTIONAL", // 单向认证
        CertName: this.appendTimeSuffix(certName || cert.domain),
        CertKey: cert.key,
        CertContent: cert.crt,
      },
      LoadBalancerId: props.loadBalancerId,
      ListenerId: props.listenerId,
    };
  }

  async getCLBList(client: any, props: TaskInput) {
    const params = {
      Limit: 100, // 最大暂时只支持100个，暂时没做翻页
      OrderBy: "CreateTime",
      OrderType: 0,
      ...props.DescribeLoadBalancers,
    };
    const ret = await client.DescribeLoadBalancers(params);
    this.checkRet(ret);
    return ret.LoadBalancerSet;
  }

  async getListenerList(client: any, balancerId: any, listenerIds: any) {
    // HTTPS
    const params = {
      LoadBalancerId: balancerId,
      Protocol: "HTTPS",
      ListenerIds: listenerIds,
    };
    const ret = await client.DescribeListeners(params);
    this.checkRet(ret);
    return ret.Listeners;
  }

  getClient(accessProvider: TencentAccess, region: string) {
    const ClbClient = tencentcloud.clb.v20180317.Client;

    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region: region,
      profile: {
        httpProfile: {
          endpoint: "clb.tencentcloudapi.com",
        },
      },
    };

    return new ClbClient(clientConfig);
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error("执行失败：" + ret.Error.Code + "," + ret.Error.Message);
    }
  }
}
