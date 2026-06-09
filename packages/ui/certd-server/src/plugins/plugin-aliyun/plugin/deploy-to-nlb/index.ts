import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo, CertReader } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames } from "@certd/plugin-cert";
import { AliyunAccess } from "../../../plugin-lib/aliyun/access/index.js";
import { AliyunClient, AliyunSslClient, CasCertId } from "../../../plugin-lib/aliyun/lib/index.js";
import { AliyunClientV2 } from "../../../plugin-lib/aliyun/lib/aliyun-client-v2.js";
@IsTaskPlugin({
  name: "AliyunDeployCertToNLB",
  title: "阿里云-部署至NLB（网络负载均衡）",
  icon: "svg:icon-aliyun",
  group: pluginGroups.aliyun.key,
  desc: "NLB,网络负载均衡,更新监听器的默认证书",
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class AliyunDeployCertToNLB extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择证书申请任务输出的域名证书\n或者选择前置任务“上传证书到阿里云”任务的证书ID，可以减少上传到阿里云的证书数量",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "uploadCertToAliyun"],
    },
    required: true,
  })
  cert!: CertInfo | number | CasCertId;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "证书接入点",
    helper: "不会选就保持默认即可",
    value: "cas.aliyuncs.com",
    component: {
      name: "a-select",
      options: [
        { value: "cas.aliyuncs.com", label: "中国大陆" },
        { value: "cas.ap-southeast-1.aliyuncs.com", label: "新加坡" },
        { value: "cas.eu-central-1.aliyuncs.com", label: "德国（法兰克福）" },
      ],
    },
    required: true,
  })
  casEndpoint!: string;

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

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "NLB所在地区",
      typeName: "AliyunDeployCertToNLB",
      single: true,
      action: AliyunDeployCertToNLB.prototype.onGetRegionList.name,
      watches: ["accessId"],
    })
  )
  regionId: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "负载均衡列表",
      helper: "要部署证书的负载均衡ID",
      typeName: "AliyunDeployCertToNLB",
      action: AliyunDeployCertToNLB.prototype.onGetLoadBalanceList.name,
      watches: ["regionId"],
    })
  )
  loadBalancers!: string[];

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "监听器列表",
      helper: "要部署证书的监听器列表",
      typeName: "AliyunDeployCertToNLB",
      action: AliyunDeployCertToNLB.prototype.onGetListenerList.name,
      watches: ["loadBalancers"],
    })
  )
  listeners!: string[];

  @TaskInput({
    title: "部署证书类型",
    value: "default",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        {
          label: "默认证书",
          value: "default",
        },
        {
          label: "扩展证书",
          value: "extension",
        },
      ],
    },
    required: true,
  })
  deployType = "default";

  async onInstance() {}

  async getLBClient(access: AliyunAccess, region: string) {
    const client = new AliyunClient({ logger: this.logger });

    const version = "2022-04-30";
    await client.init({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      //https://wafopenapi.cn-hangzhou.aliyuncs.com
      endpoint: `https://nlb.${region}.aliyuncs.com`,
      apiVersion: version,
    });
    return client;
  }

  async execute(): Promise<void> {
    this.logger.info(`开始部署证书到阿里云(nlb)`);
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const certId = await this.getAliyunCertId(access);
    const nlbClientV2 = this.getNLBClientV2(access);
    if (this.deployType === "extension") {
      //部署扩展证书
      await this.deployExtensionCert(nlbClientV2, certId);
    } else {
      const client = await this.getLBClient(access, this.regionId);
      await this.deployDefaultCert(certId, client);
    }

    this.logger.info(`准备开始清理过期证书`);
    await this.ctx.utils.sleep(30000);
    for (const listener of this.listeners) {
      try {
        await this.clearInvalidCert(nlbClientV2, listener);
      } catch (e) {
        this.logger.error(`清理监听器${listener}的过期证书失败`, e);
      }
    }

    this.logger.info("执行完成");
  }

  async deployExtensionCert(client: AliyunClientV2, certId: any) {
    for (const listenerId of this.listeners) {
      this.logger.info(`开始部署监听器${listenerId}的扩展证书`);
      await client.doRequest({
        // 接口名称
        action: "AssociateAdditionalCertificatesWithListener",
        // 接口版本
        version: "2022-04-30",
        data: {
          body: {
            ListenerId: listenerId,
            RegionId: this.regionId,
            "AdditionalCertificateIds.1": certId,
          },
        },
      });

      this.logger.info(`部署监听器${listenerId}的扩展证书成功`);
    }
  }

  async deployDefaultCert(certId: any, client: AliyunClient) {
    for (const listener of this.listeners) {
      //查询原来的证书
      const params: any = {
        RegionId: this.regionId,
        ListenerId: listener,
        CertificateIds: [certId], //旧sdk
      };

      const res = await client.request("UpdateListenerAttribute", params);
      this.checkRet(res);
      this.logger.info(`部署${listener}监听器证书成功`, JSON.stringify(res));
    }
  }

  getNLBClientV2(access: AliyunAccess) {
    return access.getClient(`nlb.${this.regionId}.aliyuncs.com`);
  }

  async clearInvalidCert(client: AliyunClientV2, listener: string) {
    this.logger.info(`开始清理监听器${listener}的过期证书`);
    const req = {
      // 接口名称
      action: "ListListenerCertificates",
      // 接口版本
      version: "2022-04-30",
      data: {
        body: {
          ListenerId: listener,
          RegionId: this.regionId,
        },
      },
    };
    const res = await client.doRequest(req);
    const list = res.Certificates;
    if (list.length === 0) {
      this.logger.info(`监听器${listener}没有绑定证书`);
      return;
    }

    const sslClient = new AliyunSslClient({
      access: client.access,
      logger: this.logger,
      endpoint: this.casEndpoint,
    });

    const certIds = [];
    for (const item of list) {
      this.logger.info(`监听器${listener}绑定的证书${item.CertificateId},status:${item.Status},IsDefault:${item.IsDefault}`);
      if (item.Status !== "Associated") {
        continue;
      }
      if (item.IsDefault) {
        continue;
      }
      certIds.push(parseInt(item.CertificateId));
    }
    this.logger.info(`监听器${listener}绑定的证书${certIds}`);
    //检查是否过期，过期则删除
    const invalidCertIds = [];
    for (const certId of certIds) {
      const res = await sslClient.getCertInfo(certId);
      this.logger.info(`证书${certId}过期时间:${res.notAfter}`);
      if (res.notAfter < new Date().getTime()) {
        invalidCertIds.push(certId);
      }
    }
    if (invalidCertIds.length === 0) {
      this.logger.info(`监听器${listener}没有过期的证书`);
      return;
    }
    this.logger.info(`开始解绑过期的证书:${invalidCertIds},listener:${listener}`);

    const ids: any = {};
    let i = 0;
    for (const certId of invalidCertIds) {
      i++;
      ids[`AdditionalCertificateIds.${i}`] = certId;
    }
    await client.doRequest({
      // 接口名称
      action: "DissociateAdditionalCertificatesFromListener",
      // 接口版本
      version: "2022-04-30",
      data: {
        body: {
          ListenerId: listener,
          RegionId: this.regionId,
          ...ids,
        },
      },
    });
    this.logger.info(`解绑过期证书成功`);
  }

  async getAliyunCertId(access: AliyunAccess) {
    let certId: any = this.cert;
    if (typeof this.cert === "object") {
      const casCert = this.cert as CasCertId;
      if (casCert.certId) {
        return casCert.certId;
      }

      const certInfo = this.cert as CertInfo;

      const sslClient = new AliyunSslClient({
        access,
        logger: this.logger,
        endpoint: this.casEndpoint,
      });

      const certName = this.buildCertName(CertReader.getMainDomain(certInfo.crt));

      const certIdRes = await sslClient.uploadCertificate({
        name: certName,
        cert: certInfo,
      });
      certId = certIdRes.certId as any;
    }
    return certId;
  }

  async onGetRegionList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await this.getLBClient(access, "cn-shanghai");

    const res = await client.request("DescribeRegions", {});
    this.checkRet(res);
    if (!res?.Regions || res?.Regions.length === 0) {
      throw new Error("没有找到Regions列表");
    }

    return res.Regions.map((item: any) => {
      return {
        label: item.LocalName,
        value: item.RegionId,
        endpoint: item.RegionEndpoint,
      };
    });
  }

  async onGetLoadBalanceList(data: any) {
    if (!this.accessId) {
      throw new Error("请先选择Access授权");
    }
    if (!this.regionId) {
      throw new Error("请先选择地区");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await this.getLBClient(access, this.regionId);

    const params = {
      MaxResults: 100,
    };
    const res = await client.request("ListLoadBalancers", params);
    this.checkRet(res);
    if (!res?.LoadBalancers || res?.LoadBalancers.length === 0) {
      throw new Error("没有找到LoadBalancers");
    }

    return res.LoadBalancers.map((item: any) => {
      const label = `${item.LoadBalancerId}<${item.LoadBalancerName}}>`;
      return {
        label: label,
        value: item.LoadBalancerId,
      };
    });
  }

  async onGetListenerList(data: any) {
    if (!this.accessId) {
      throw new Error("请先选择Access授权");
    }
    if (!this.regionId) {
      throw new Error("请先选择地区");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await this.getLBClient(access, this.regionId);

    const params: any = {
      MaxResults: 100,
    };
    if (this.loadBalancers && this.loadBalancers.length > 0) {
      params.LoadBalancerIds = this.loadBalancers;
    }
    const res = await client.request("ListListeners", params);
    this.checkRet(res);
    if (!res?.Listeners || res?.Listeners.length === 0) {
      throw new Error("没有找到TCPSSL监听器");
    }

    return res.Listeners.map((item: any) => {
      const label = `${item.ListenerId}<${item.ListenerDescription}@${item.LoadBalancerId}>`;
      return {
        label: label,
        value: item.ListenerId,
        lbid: item.LoadBalancerId,
      };
    });
  }

  checkRet(ret: any) {
    if (ret.Code != null) {
      throw new Error(ret.Message);
    }
  }
}

new AliyunDeployCertToNLB();
