import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import dayjs from "dayjs";
import { TencentAccess } from "../../../plugin-lib/tencent/index.js";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createRemoteSelectInputDefine } from "@certd/plugin-lib";

const clbRegionOptions = [
  { value: "default", label: "就近地域接入（推荐，只支持非金融区）", endpoint: "clb.tencentcloudapi.com" },
  { value: "ap-guangzhou", label: "华南地区（广州）", endpoint: "clb.ap-guangzhou.tencentcloudapi.com" },
  { value: "ap-shanghai", label: "华东地区（上海）", endpoint: "clb.ap-shanghai.tencentcloudapi.com" },
  { value: "ap-nanjing", label: "华东地区（南京）", endpoint: "clb.ap-nanjing.tencentcloudapi.com" },
  { value: "ap-beijing", label: "华北地区（北京）", endpoint: "clb.ap-beijing.tencentcloudapi.com" },
  { value: "ap-chengdu", label: "西南地区（成都）", endpoint: "clb.ap-chengdu.tencentcloudapi.com" },
  { value: "ap-chongqing", label: "西南地区（重庆）", endpoint: "clb.ap-chongqing.tencentcloudapi.com" },
  { value: "ap-hongkong", label: "港澳台地区（中国香港）", endpoint: "clb.ap-hongkong.tencentcloudapi.com" },
  { value: "ap-singapore", label: "亚太东南（新加坡）", endpoint: "clb.ap-singapore.tencentcloudapi.com" },
  { value: "ap-jakarta", label: "亚太东南（雅加达）", endpoint: "clb.ap-jakarta.tencentcloudapi.com" },
  { value: "ap-bangkok", label: "亚太东南（曼谷）", endpoint: "clb.ap-bangkok.tencentcloudapi.com" },
  { value: "ap-seoul", label: "亚太东北（首尔）", endpoint: "clb.ap-seoul.tencentcloudapi.com" },
  { value: "ap-tokyo", label: "亚太东北（东京）", endpoint: "clb.ap-tokyo.tencentcloudapi.com" },
  { value: "na-ashburn", label: "美国东部（弗吉尼亚）", endpoint: "clb.na-ashburn.tencentcloudapi.com" },
  { value: "na-siliconvalley", label: "美国西部（硅谷）", endpoint: "clb.na-siliconvalley.tencentcloudapi.com" },
  { value: "sa-saopaulo", label: "南美地区（圣保罗）", endpoint: "clb.sa-saopaulo.tencentcloudapi.com" },
  { value: "eu-frankfurt", label: "欧洲地区（法兰克福）", endpoint: "clb.eu-frankfurt.tencentcloudapi.com" },
  { value: "ap-shanghai-fsi", label: "华东地区（上海金融）", endpoint: "clb.ap-shanghai-fsi.tencentcloudapi.com" },
  { value: "ap-shenzhen-fsi", label: "华南地区（深圳金融）", endpoint: "clb.ap-shenzhen-fsi.tencentcloudapi.com" },
];

@IsTaskPlugin({
  name: "DeployCertToTencentCLB",
  title: "腾讯云-部署到CLB",
  icon: "svg:icon-tencentcloud",
  group: pluginGroups.tencent.key,
  desc: "暂时只支持单向认证证书，暂时只支持通用负载均衡",
  dependPlugins: {
    "access:tencent": "*",
  },
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToTencentCLB extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "UploadCertToTencent"],
    },
    required: true,
  })
  cert!: string | CertInfo;

  @TaskInput({
    title: "Access提供者",
    helper: "access授权",
    component: {
      name: "access-selector",
      type: "tencent",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "大区",
      helper: "请选择CLB地域",
      action: DeployCertToTencentCLB.prototype.onGetRegionList.name,
      single: true,
      pager: false,
      search: false,
    })
  )
  region!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "负载均衡ID",
      helper: "请选择要部署证书的负载均衡",
      action: DeployCertToTencentCLB.prototype.onGetCLBList.name,
      watches: ["region"],
      single: true,
      pager: false,
      search: false,
    })
  )
  loadBalancerId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "监听器ID",
      helper: "请选择要部署证书的HTTPS监听器",
      action: DeployCertToTencentCLB.prototype.onGetListenerList.name,
      watches: ["region", "loadBalancerId"],
      single: true,
      pager: false,
      search: false,
    })
  )
  listenerId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "域名",
      helper: "如果开启了SNI，请选择要部署证书的域名；未开启SNI时可以留空",
      action: DeployCertToTencentCLB.prototype.onGetDomainList.name,
      watches: ["region", "loadBalancerId", "listenerId"],
      required: false,
      single: false,
      pager: false,
      search: false,
    })
  )
  domain!: string | string[];

  @TaskInput({
    title: "证书名称前缀",
  })
  certName!: string;

  client: any;
  async onInstance() {
    this.client = await this.getClient();
  }

  async getClient() {
    const sdk = await (this as any).importRuntime("tencentcloud-sdk-nodejs/tencentcloud/services/clb/v20180317/index.js");
    const ClbClient = sdk.v20180317.Client;

    const accessProvider = (await this.getAccess(this.accessId)) as TencentAccess;

    const regionOption = clbRegionOptions.find(item => item.value === this.region);
    const endpoint = regionOption?.endpoint || "clb.tencentcloudapi.com";
    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region: this.region === "default" ? "" : this.region,
      profile: {
        httpProfile: {
          endpoint: accessProvider.buildEndpoint(endpoint),
        },
      },
    };

    return new ClbClient(clientConfig);
  }

  async onGetRegionList(data: PageSearch) {
    return clbRegionOptions;
  }

  async execute(): Promise<void> {
    const client = this.client;

    if (!this.domain || this.domain.length === 0) {
      await this.updateListener(client);
    } else {
      const domains = Array.isArray(this.domain) ? this.domain : [this.domain];
      for (const domain of domains) {
        this.logger.info(`开始更新域名证书:${domain},请确保已经开启了sni`);
        // const lastCertId = await this.getCertIdFromProps(client, domain);

        await this.updateByDomainAttr(client, domain);

        // 不要做检查，相同的证书，不会生成新的证书id
        // const checkDeployed = async (wait = 5) => {
        //   await this.ctx.utils.sleep(wait * 1000);
        //   this.logger.info(`等待${wait}秒`);
        //   const newCertId = await this.getCertIdFromProps(client, domain);
        //   this.logger.info(`oldCertId:${lastCertId} , newCertId:${newCertId}`);
        //   if ((lastCertId && newCertId === lastCertId) || (!lastCertId && !newCertId)) {
        //     return false;
        //   }
        //   this.logger.info('腾讯云证书ID:', newCertId);
        //   return true;
        // };
        // let count = 0;
        // while (true) {
        //   count++;
        //   const res = await checkDeployed(5);
        //   if (res) {
        //     break;
        //   }
        //   if (count > 6) {
        //     this.logger.warn('等待超时，可能证书未部署成功');
        //   }
        // }
      }
    }

    return;
  }

  async getCertIdFromProps(client: any, domain: string) {
    const listenerRet = await this.getListenerList(client, this.loadBalancerId, this.listenerId ? [this.listenerId] : null);
    return this.getCertIdFromListener(listenerRet[0], domain);
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

  async updateListener(client: any) {
    const params = this.buildProps();
    const ret = await client.ModifyListener(params);
    this.checkRet(ret);
    this.logger.info("设置腾讯云CLB证书成功:", ret.RequestId, "->loadBalancerId:", this.loadBalancerId, "listenerId", this.listenerId);
    return ret;
  }

  async updateByDomainAttr(client: any, domain) {
    const params: any = this.buildProps();

    params.Domain = domain;
    const ret = await client.ModifyDomainAttributes(params);
    this.checkRet(ret);
    this.logger.info(`[${domain}] 设置腾讯云CLB证书(sni)任务已提交:taskId：${ret.RequestId}，loadBalancerId:${this.loadBalancerId}，listenerId:${this.listenerId}`);

    const requestId = ret.RequestId;
    while (true) {
      const statusRes = await client.DescribeTaskStatus({ TaskId: requestId });

      if (statusRes.Status === 0) {
        this.logger.info(`[${domain}] 腾讯云CLB证书(sni)设置成功`);
        break;
      } else if (statusRes.Status === 2) {
        this.logger.info(`[${domain}] 腾讯云CLB证书(sni)设置进行中，请耐心等待`);
      } else if (statusRes.Status === 1) {
        throw new Error(`[${domain}] 腾讯云CLB证书(sni)设置失败:` + statusRes.Message);
      }
      await this.ctx.utils.sleep(5000);
    }
    return ret;
  }
  appendTimeSuffix(name: string) {
    if (name == null) {
      name = "certd";
    }
    return name + "-" + dayjs().format("YYYYMMDD-HHmmss");
  }
  buildProps() {
    const certId = this.cert as string;
    const certInfo = this.cert as CertInfo;
    if (typeof this.cert === "string") {
      return {
        Certificate: {
          SSLMode: "UNIDIRECTIONAL", // 单向认证
          CertId: certId,
        },
        LoadBalancerId: this.loadBalancerId,
        ListenerId: this.listenerId,
      };
    }
    return {
      Certificate: {
        SSLMode: "UNIDIRECTIONAL", // 单向认证
        CertName: this.appendTimeSuffix(this.certName || "certd"),
        CertKey: certInfo.key,
        CertContent: certInfo.crt,
      },
      LoadBalancerId: this.loadBalancerId,
      ListenerId: this.listenerId,
    };
  }

  async getCLBList(client: any) {
    const params = {
      Limit: 100, // 最大暂时只支持100个，暂时没做翻页
      OrderBy: "CreateTime",
      OrderType: 0,
      // ...this.DescribeLoadBalancers,
    };
    const ret = await client.DescribeLoadBalancers(params);
    this.checkRet(ret);
    return ret.LoadBalancerSet;
  }

  async onGetCLBList(data: PageSearch) {
    if (!this.accessId) {
      throw new Error("请选择Access提供者");
    }

    const client = await this.getClient();
    const list = await this.getCLBList(client);
    if (!list || list.length === 0) {
      return [];
    }

    return list.map((item: any) => {
      const loadBalancerId = item.LoadBalancerId;
      const loadBalancerName = item.LoadBalancerName || loadBalancerId;
      return {
        value: loadBalancerId,
        label: `${loadBalancerName}<${loadBalancerId}>`,
      };
    });
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

  async onGetListenerList(data: PageSearch) {
    if (!this.accessId) {
      throw new Error("请选择Access提供者");
    }
    if (!this.loadBalancerId) {
      throw new Error("请先选择负载均衡");
    }

    const client = await this.getClient();
    const list = await this.getListenerList(client, this.loadBalancerId, null);
    if (!list || list.length === 0) {
      return [];
    }

    return list.map((item: any) => {
      const listenerId = item.ListenerId;
      const listenerName = item.ListenerName || "HTTPS监听器";
      const port = item.Port ? `:${item.Port}` : "";
      return {
        value: listenerId,
        label: `${listenerName}${port}<${listenerId}>`,
      };
    });
  }

  async onGetDomainList(data: PageSearch) {
    if (!this.accessId) {
      throw new Error("请选择Access提供者");
    }
    if (!this.loadBalancerId) {
      throw new Error("请先选择负载均衡");
    }
    if (!this.listenerId) {
      throw new Error("请先选择监听器");
    }

    const client = await this.getClient();
    const listeners = await this.getListenerList(client, this.loadBalancerId, [this.listenerId]);
    const listener = listeners?.[0];
    const domains = listener?.Rules?.map((rule: any) => rule.Domain).filter(Boolean) || [];
    const uniqueDomains = [...new Set(domains)];

    return uniqueDomains.map(domain => {
      return {
        value: domain,
        label: domain,
        domain,
      };
    });
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error("执行失败：" + ret.Error.Code + "," + ret.Error.Message);
    }
  }
}
