import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { UCloudAccess } from "../access.js";

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
      from: [...CertApplyPluginNames, ":UCloudCertId:"]
    }
  })
  cert!: CertInfo | { type: string, id: number, name: string };

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
      title: "负载均衡实例",
      helper: "选择ULB负载均衡实例",
      action: UCloudDeployToALB.prototype.onGetULBList.name
    })
  )
  ulbId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "监听器列表",
      helper: "要更新的ALB监听器列表",
      action: UCloudDeployToALB.prototype.onGetVServerList.name
    })
  )
  vServerList!: string[];

  async onInstance() {
  }

  async execute(): Promise<void> {
    const access = await this.getAccess<UCloudAccess>(this.accessId);
    let certType = "ussl"
    let certId = 0
    
    if (this.cert && typeof this.cert === 'object' && 'id' in this.cert) {
      certId = this.cert.id
    } else {
      const cert = await access.SslUploadCert({
        cert: this.cert as CertInfo
      });
      certId = cert.id
    }

    for (const item of this.vServerList) {
      this.logger.info(`----------- 开始更新监听器：${item}`);
      await this.deployToAlb({
        access: access,
        ulbId: this.ulbId,
        vServerId: item,
        certId: certId,
        certType: certType
      });
      this.logger.info(`----------- 更新监听器证书${item}成功`);
    }

    this.logger.info("部署完成");
  }

  async deployToAlb(req: { access: any, ulbId: string, vServerId: string, certId: number, certType: string }) {
    const { access, ulbId, vServerId, certId, certType } = req

    this.logger.info(`----------- 获取监听器${vServerId}配置`);
    const vServerRes = await access.invoke({
      "Action": "DescribeVServer",
      "ProjectId": access.projectId,
      "ULBId": ulbId,
      "VServerId": vServerId
    });

    const vServer = vServerRes.VServerSet?.[0];
    if (!vServer) {
      throw new Error(`没有找到监听器${vServerId}`);
    }

    this.logger.info(`----------- 更新ALB监听器HTTPS配置${vServerId}`);
    const resp = await access.invoke({
      "Action": "UpdateVServerAttribute",
      "ProjectId": access.projectId,
      "ULBId": ulbId,
      "VServerId": vServerId,
      "SSLMode": "port",
      "CertificateId": certId,
      "CertificateType": certType
    });
    this.logger.info(`----------- 部署ALB证书${vServerId}成功，${JSON.stringify(resp)}`);
  }

  async onGetULBList(req: PageSearch = {}) {
    const access = await this.getAccess<UCloudAccess>(this.accessId);

    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 100;
    
    const res = await access.invoke({
      "Action": "DescribeULB",
      "ProjectId": access.projectId,
      "Offset": (pageNo - 1) * pageSize,
      "Limit": pageSize
    });

    const total = res.TotalCount || 0;
    const list = res.Dataset || [];
    
    if (!list || list.length === 0) {
      throw new Error("没有找到ULB实例，请先在控制台创建ULB实例");
    }

    const options = list.map((item: any) => {
      return {
        label: `${item.Name || item.ULBId}<${item.ULBId}>`,
        value: `${item.ULBId}`
      };
    });

    return {
      list: options,
      total: total,
      pageNo: pageNo,
      pageSize: pageSize
    };
  }

  async onGetVServerList(req: PageSearch = {}) {
    const access = await this.getAccess<UCloudAccess>(this.accessId);

    if (!this.ulbId) {
      throw new Error("请先选择ULB负载均衡实例");
    }

    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 100;
    
    const res = await access.invoke({
      "Action": "DescribeVServer",
      "ProjectId": access.projectId,
      "ULBId": this.ulbId,
      "Offset": (pageNo - 1) * pageSize,
      "Limit": pageSize
    });

    const total = res.TotalCount || 0;
    const list = res.VServerSet || [];
    
    if (!list || list.length === 0) {
      throw new Error("没有找到ALB监听器，请先在控制台创建ALB实例和监听器");
    }

    const options = list.map((item: any) => {
      return {
        label: `${item.VServerName || item.VServerId}<${item.VServerId}>`,
        value: `${item.VServerId}`,
        domain: item.VServerName || item.VServerId
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
