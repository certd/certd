import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { CertReader, createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { UCloudAccess } from "../access.js";
import { UCloudRegions } from "./constants.js";

@IsTaskPlugin({
  name: "UCloudDeployToALB",
  title: "UCloud-部署到ALB",
  desc: "将证书部署到UCloud ALB(应用负载均衡)",
  icon: "svg:icon-ucloud",
  group: pluginGroups.ucloud.key,
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed
    }
  }
})
export class UCloudDeployToALB extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames]
    }
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "UCloud授权",
    component: {
      name: "access-selector",
      type: "ucloud"
    },
    required: true
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "地域",
      helper: "选择UCloud地域",
      action: UCloudDeployToALB.prototype.onGetRegionList.name,
      multi:false
    })
  )
  region!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "负载均衡实例",
      helper: "选择ALB负载均衡实例",
      action: UCloudDeployToALB.prototype.onGetALBList.name,
      multi:false
    })
  )
  loadBalancerId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "监听器列表",
      helper: "要更新的ALB监听器列表",
      action: UCloudDeployToALB.prototype.onGetListenerList.name
    })
  )
  listenerList!: string[];

  @TaskInput({
    title: "上传证书模式",
    helper: "选择是更新默认证书还是添加扩展证书",
    component: {
      name: "a-select",
      options: [
        { label: "更新默认证书", value: "update_default" },
        { label: "添加扩展证书", value: "add_extension" }
      ]
    },
    required: true,
    default: "update_default"
  })
  deployMode!: string;

  async onInstance() {
  }

  async onGetRegionList(req: PageSearch = {}) {
    const access = await this.getAccess<UCloudAccess>(this.accessId);
    
    const res = await access.GetRegion();
    let list = res.Regions || [];
    
    if (!list || list.length === 0) {
      throw new Error("没有获取到UCloud地域列表");
    }

    const haveSet = {}
    list = list.filter((item: any) => {
      const region = item.Region;
      if (haveSet[region]) {
        return false;
      }
      haveSet[region] = true;
      return true;
    })
    let options = list.map((item: any) => {
      const region = item.Region;
      const name = UCloudRegions.find((r) => r.value === region)?.label || item.RegionName;
      return {
        label: `${name}(${item.Region})`,
        value: item.Region
      };
    });

    return {
      list: options,
      total: options.length,
      pageNo: 1,
      pageSize: options.length
    };
  }

  async uploadCertToULB(){ 
    const access = await this.getAccess<UCloudAccess>(this.accessId);
    const certInfo = this.cert as CertInfo;
      const sslName = CertReader.buildCertName(certInfo);
      const sslContent = certInfo.crt + '\n' + certInfo.key;
      
      const createRes = await access.invoke({
        "Action": "CreateSSL",
        "Region": this.region,
        "ProjectId": access.projectId,
        "SSLName": sslName,
        "SSLContent": sslContent,
      });
      
      if (createRes.RetCode !== 0) {
        throw new Error(`创建SSL证书失败: ${createRes.Message || '未知错误'}`);
      }
      
    return createRes.SSLId;
  }

  async execute(): Promise<void> {
    const access = await this.getAccess<UCloudAccess>(this.accessId);
    let certId = await this.uploadCertToULB();
    
   

    for (const item of this.listenerList) {
      this.logger.info(`----------- 开始处理监听器：${item}`);
      if (this.deployMode === "update_default") {
        await this.updateDefaultCert({
          access: access,
          loadBalancerId: this.loadBalancerId,
          listenerId: item,
          certId: certId
        });
        this.logger.info(`----------- 更新监听器默认证书${item}成功`);
      } else if (this.deployMode === "add_extension") {
        await this.addExtensionCert({
          access: access,
          loadBalancerId: this.loadBalancerId,
          listenerId: item,
          certId: certId
        });
        this.logger.info(`----------- 添加监听器扩展证书${item}成功`);
      }
    }

    this.logger.info("部署完成");
  }

  async updateDefaultCert(req: { access: any, loadBalancerId: string, listenerId: string, certId: string }) {
    const { access, loadBalancerId, listenerId, certId } = req
   
    this.logger.info(`----------- 更新ALB监听器默认证书${listenerId}`);
    const resp = await access.invoke({
      "Action": "UpdateListenerAttribute",
      "Region": this.region,
      "ProjectId": access.projectId,
      "LoadBalancerId": loadBalancerId,
      "ListenerId": listenerId,
      "Certificates": [certId]
    });
    this.logger.info(`----------- 更新监听器默认证书${listenerId}成功，${JSON.stringify(resp)}`);
  }

  async addExtensionCert(req: { access: any, loadBalancerId: string, listenerId: string, certId: string }) {
    const { access, loadBalancerId, listenerId, certId } = req

    this.logger.info(`----------- 添加ALB监听器扩展证书${listenerId}`);
    const resp = await access.invoke({
      "Action": "AddSSLBinding",
      "Region": this.region,
      "ProjectId": access.projectId,
      "LoadBalancerId": loadBalancerId,
      "ListenerId": listenerId,
      "SSLIds": [certId]
    });
    this.logger.info(`----------- 添加监听器扩展证书${listenerId}成功，${JSON.stringify(resp)}`);
  }

  async onGetALBList(req: PageSearch = {}) {
    const access = await this.getAccess<UCloudAccess>(this.accessId);

    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 100;
    
    const res = await access.invoke({
      "Action": "DescribeLoadBalancers",
      "Region": this.region,
      "ProjectId": access.projectId,
      "Type": "Application",
      "Offset": (pageNo - 1) * pageSize,
      "Limit": pageSize
    });

    const total = res.LoadBalancers?.length || 0;
    const list = res.LoadBalancers || [];
    
    if (!list || list.length === 0) {
      throw new Error("没有找到ALB实例，请先在控制台创建ALB实例");
    }

    const options = list.map((item: any) => {
      return {
        label: `${item.Name || item.LoadBalancerId}<${item.LoadBalancerId}>`,
        value: `${item.LoadBalancerId}`
      };
    });

    return {
      list: options,
      total: total,
      pageNo: pageNo,
      pageSize: pageSize
    };
  }


  async onGetListenerList(req: PageSearch = {}) {
    const access = await this.getAccess<UCloudAccess>(this.accessId);

    if (!this.loadBalancerId) {
      throw new Error("请先选择ALB负载均衡实例");
    }

    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 100;
    
    const res = await access.invoke({
      "Action": "DescribeListeners",
      "Region": this.region,
      "ProjectId": access.projectId,
      "LoadBalancerId": this.loadBalancerId,
      "Offset": (pageNo - 1) * pageSize,
      "Limit": pageSize
    });

    const total = res.TotalCount || 0;
    const list = res.Listeners || [];
    
    if (!list || list.length === 0) {
      throw new Error("没有找到ALB监听器，请先在控制台创建ALB实例和监听器");
    }

    const options = list.map((item: any) => {
      return {
        label: `${item.Name || item.ListenerId}<${item.ListenerId}>`,
        value: `${item.ListenerId}`,
        domain: item.Name || item.ListenerId
      };
    });

    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
      total: total,
      pageNo: pageNo,
      pageSize: pageSize
    };
  }
}

new UCloudDeployToALB();
