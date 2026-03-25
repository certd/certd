import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { VolcengineAccess } from "../access.js";
import { VolcengineClient } from "../ve-client.js";
import dayjs from "dayjs";

@IsTaskPlugin({
  name: "VolcengineDeployToALB",
  title: "火山引擎-部署证书至ALB",
  icon: "svg:icon-volcengine",
  group: pluginGroups.volcengine.key,
  desc: "部署至火山引擎应用负载均衡",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed
    }
  }
})
export class VolcengineDeployToALB extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "VolcengineUploadToCertCenter"]
    },
    required: true
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];



  @TaskInput({
    title: "Access授权",
    helper: "火山引擎AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "volcengine"
    },
    required: true
  })
  accessId!: string;

  @TaskInput({
    title: "Region",
    helper: "地区选择",
    component: {
      name: "a-select",
      options: [
        /**
         * 中国地区
         * 华北2
         * 北京
         * cn-beijing
         * 4
         * 可用区A：cn-beijing-a
         * 可用区B：cn-beijing-b
         * 可用区C：cn-beijing-c
         * 可用区D：cn-beijing-d
         * 商用
         * 华东2
         * 上海
         * cn-shanghai
         * 4
         * 可用区A：cn-shanghai-a
         * 可用区B：cn-shanghai-b
         * 可用区C：cn-shanghai-c
         * 可用区E：cn-shanghai-e
         * 商用
         * 华南1
         * 广州
         * cn-guangzhou
         * 3
         * 可用区A：cn-guangzhou-a
         * 可用区B：cn-guangzhou-b
         * 可用区C：cn-guangzhou-c
         * 商用
         * 中国香港
         * 香港
         * cn-hongkong
         * 2
         * 可用区A：cn-hongkong-a
         * 可用区B：cn-hongkong-b
         * 商用
         * 其他国家和地区
         * 亚太东南
         * 柔佛
         * ap-southeast-1
         * 2
         * 可用区A：ap-southeast-1a
         * 可用区B：ap-southeast-1b
         * 商用
         * 雅加达
         * ap-southeast-3
         * 2
         * 可用区A：ap-southeast-3a
         * 可用区B：ap-southeast-3b
         * 商用
         */
        { label: "北京", value: "cn-beijing" },
        { label: "上海", value: "cn-shanghai" },
        { label: "广州", value: "cn-guangzhou" },
        { label: "香港", value: "cn-hongkong" },
        { label: "柔佛", value: "ap-southeast-1" },
        { label: "雅加达", value: "ap-southeast-3" }

      ]
    },
    value: "cn-beijing",
    required: true
  })
  regionId!: string;


  @TaskInput(
    createRemoteSelectInputDefine({
      title: "监听器列表",
      helper: "选择要部署证书的监听器\n需要在监听器中选择证书中心，进行跨服务访问授权",
      action: VolcengineDeployToALB.prototype.onGetListenerList.name,
      watches: ["certDomains", "accessId", "regionId"],
      required: true
    })
  )
  listenerList!: string | string[];


  @TaskInput({
    title: "证书部署类型",
    helper: "选择部署默认证书还是扩展证书",
    component: {
      name: "a-select",
      options: [
        { label: "默认证书", value: "default" },
        { label: "扩展证书", value: "extension" }
      ]
    },
    value: "default",
    required: true
  })
  certType!: string;


  async onInstance() {
  }

  async execute(): Promise<void> {
    this.logger.info("开始部署证书到火山引擎ALB");
    const access = await this.getAccess<VolcengineAccess>(this.accessId);
    const certService = await this.getCertService(access);
    let certId = this.cert;
    if (typeof certId !== "string") {
      const certInfo = this.cert as CertInfo;
      this.logger.info(`开始上传证书`);
      certId = await certService.ImportCertificate({
        certName:this.appendTimeSuffix("certd"),
        cert:certInfo
      });
      this.logger.info(`上传证书成功:${certId}`);
    } else {
      this.logger.info(`使用已有证书ID:${certId}`);
    }

    const service = await this.getAlbService();
    for (const listener of this.listenerList) {
      this.logger.info(`开始部署监听器${listener}证书`);
      if (this.certType === "default") {
        // 部署默认证书
        const res = await service.request({
          action: "ModifyListenerAttributes",
          query: {
            ListenerId: listener,
            CertificateSource: "cert_center",
            CertCenterCertificateId: certId
          }
        });
        this.logger.info(`部署监听器${listener}默认证书成功，res:${JSON.stringify(res)}`);
      } else {
        // 部署扩展证书
        await this.deployExtensionCertificate(service, listener, certId as string);
      }
      await this.ctx.utils.sleep(5000);
    }

    this.logger.info("部署完成");
  }

  private async deployExtensionCertificate(service: any, listenerId: string, certId: string) {
    // 获取监听器当前的扩展证书列表
    const domainExtensions = await this.getListenerDomainExtensions(service, listenerId);
    
    // 删除过期的扩展证书
    try {
      await this.deleteExpiredExtensions(service, listenerId, domainExtensions);
    } catch (error) {
      this.logger.error(`删除过期扩展证书失败:${error.message ||error}`);
    }

    // 新增扩展证书
    const query: any = {
      ListenerId: listenerId,
      "DomainExtensions.1.Action": "create",
      "DomainExtensions.1.CertificateSource": "cert_center",
      "DomainExtensions.1.CertCenterCertificateId": certId
    };

    // 如果有证书域名信息，添加到扩展证书中
    if (this.certDomains && this.certDomains.length > 0) {
      query["DomainExtensions.1.Domain"] = this.certDomains[0];
    }

    await service.request({
      action: "ModifyListenerAttributes",
      query: query
    });
    this.logger.info(`部署监听器${listenerId}扩展证书成功`);
  }

  private async getListenerDomainExtensions(service: any, listenerId: string): Promise<any[]> {
    const res = await service.request({
      action: "DescribeListenerAttributes",
      method: "GET",
      query: {
        ListenerId: listenerId
      }
    });
    
    return res.Result.DomainExtensions || [];
  }

  private async deleteExpiredExtensions(service: any, listenerId: string, domainExtensions: any[]) {
    const expiredExtensions = [];
    for (const ext of domainExtensions) {
      if (!await this.isCertificateExpired(ext)) {
        expiredExtensions.push(ext);
      }
    }
    if (expiredExtensions.length === 0) {
      this.logger.info(`没有过期的扩展证书，跳过删除`);
      return;
    }

    const query: any = {
      ListenerId: listenerId
    };
    expiredExtensions.forEach((ext, index) => {
      const idx = index + 1;
      query[`DomainExtensions.${idx}.Action`] = "delete";
      query[`DomainExtensions.${idx}.DomainExtensionId`] = ext.DomainExtensionId;
    });
    
    this.logger.info(`准备删除过期扩展证书，数量：${expiredExtensions.length}个，query:${JSON.stringify(query)}`);

    await service.request({
      action: "ModifyListenerAttributes",
      query: query
    });
    this.logger.info(`删除${expiredExtensions.length}个过期扩展证书成功`);
     await this.ctx.utils.sleep(5000);
  }


  private async getCertService(access: VolcengineAccess) {
    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http
    });

    return await client.getCertCenterService();
  }

  private async getAlbService() {
    const access = await this.getAccess<VolcengineAccess>(this.accessId);

    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http
    });

    const service = await client.getAlbService({
      region: this.regionId
    });
    return service;
  }

  private async isCertificateExpired(extension: any): Promise<boolean> {
    try {
      let certificateId: string;
      
      // 根据证书来源获取证书ID
      if (extension.CertificateSource === "cert_center") {
        certificateId = extension.CertCenterCertificateId;
      } else if (extension.CertificateSource === "alb") {
        this.logger.warn(`ALB证书不支持过期检查，跳过`);
        return false;
      } else if (extension.CertificateSource === "pca_leaf") {
        this.logger.warn(`PCA Leaf证书不支持过期检查，跳过`);
        return false;
      } else {
        this.logger.warn(`未知的证书来源: ${extension.CertificateSource}，跳过`);
        return false;
      }
      
      if (!certificateId) {
        this.logger.warn(`证书ID为空，跳过`);
        return false;
      }
      
      // 获取证书服务
      const access = await this.getAccess<VolcengineAccess>(this.accessId);
      const certService = await this.getCertService(access);
      
      // 获取证书详情
      const certDetail = await certService.GetCertificateDetail(certificateId);
      
      // 判断证书是否过期
      if (certDetail.NotAfter) {
        const expireTime = dayjs(certDetail.NotAfter);
        const now = dayjs();
        const isExpired = expireTime.isBefore(now);
        if (isExpired) {
          this.logger.info(`证书 ${certificateId} 已过期，过期时间: ${expireTime.toISOString()}`);
        }
        return isExpired;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`检查证书是否过期失败: ${error.message || error}`);
      return false;
    }
  }

  async onGetListenerList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const service = await this.getAlbService();

    const res = await service.request({
      action: "DescribeListeners",
      method: "GET",
      query: {
        PageSize: 100,
        Protocol: "HTTPS"
      },
    });

    const list = res.Result.Listeners;
    if (!list || list.length === 0) {
      throw new Error("找不到HTTPS类型的负载均衡监听器，您也可以手动输入监听器ID");
    }
    return list.map((item: any) => {
      return {
        value: item.ListenerId,
        label: `${item.ListenerName}<${item.Description}:${item.ListenerId}>`
      };
    });
  }
}

new VolcengineDeployToALB();
