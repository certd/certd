import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { VolcengineAccess } from "../access.js";
import { VolcengineClient } from "../ve-client.js";

@IsTaskPlugin({
  name: "VolcengineDeployToVOD",
  title: "火山引擎-部署证书至VOD",
  icon: "svg:icon-volcengine",
  group: pluginGroups.volcengine.key,
  desc: "部署至火山引擎视频点播(暂不可用)",
  deprecated:"暂时缺少部署ssl接口",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed
    }
  }
})
export class VolcengineDeployToVOD extends AbstractTaskPlugin {
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


  @TaskInput(
    // createRemoteSelectInputDefine({
    //   title: "空间名称",
    //   helper: "选择要部署证书的监听器\n需要在监听器中选择证书中心，进行跨服务访问授权",
    //   action: VolcengineDeployToVOD.prototype.onGetSpaceList.name,
    //   watches: ["certDomains", "accessId", "regionId"],
    //   required: true
    // })
    {
      title: "空间名称",
      required: true
    }
  )
  spaceName!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "点播域名",
      helper: "选择要部署证书的点播域名\n需要先在域名管理页面进行证书中心访问授权（即点击去配置SSL证书）",
      action: VolcengineDeployToVOD.prototype.onGetDomainList.name,
      watches: ["certDomains", "accessId", "spaceName"],
      required: true
    })
  )
  domainList!: string | string[];


  async onInstance() {
  }

  async execute(): Promise<void> {
    this.logger.info("开始部署证书到火山引擎VOD");
    const access = await this.getAccess<VolcengineAccess>(this.accessId);
    let certId = await this.uploadOrGetCertId(access);

    const service = await this.getVodService();
    for (const item of this.domainList) {
      this.logger.info(`开始部署点播域名${item}证书`);
      await service.request({
        action: "ModifyListenerAttributes",
        query: {
          ListenerId: item,
          CertificateSource: "cert_center",
          CertCenterCertificateId: certId
        }
      });
      this.logger.info(`部署点播域名${item}证书成功`);
    }

    this.logger.info("部署完成");
  }


  private async uploadOrGetCertId(access: VolcengineAccess) {
    const certService = await this.getCertService(access);
    let certId = this.cert;
    if (typeof certId !== "string") {
      const certInfo = this.cert as CertInfo;
      this.logger.info(`开始上传证书`);
      certId = await certService.ImportCertificate({
        certName: this.appendTimeSuffix("certd"),
        cert: certInfo
      });
      this.logger.info(`上传证书成功:${certId}`);
    } else {
      this.logger.info(`使用已有证书ID:${certId}`);
    }
    return certId;
  }

  private async getCertService(access: VolcengineAccess) {
    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http
    });

    return await client.getCertCenterService();
  }


  private async getVodService(req?: { version?: string }) {
    const access = await this.getAccess<VolcengineAccess>(this.accessId);

    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http
    });

    return await client.getVodService(req);
  }

  // async onGetSpaceList(data: any) {
  //   if (!this.accessId) {
  //     throw new Error("请选择Access授权");
  //   }
  //   const service = await this.getVodService();
  //
  //   const res = await service.request({
  //     action: "ListSpace",
  //     method: "GET",
  //     query: {
  //       PageSize: 100,
  //     },
  //   });
  //
  //   const list = res.Result;
  //   if (!list || list.length === 0) {
  //     throw new Error("找不到空间，您可以手动填写");
  //   }
  //   return list.map((item: any) => {
  //     return {
  //       value: item.SpaceName,
  //       label: `${item.SpaceName}`
  //     };
  //   });
  // }

  async onGetDomainList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const service = await this.getVodService();

    const res = await service.request({
      action: "ListDomain",
      body: {
        SpaceName: this.spaceName,
        // Offset: 100
      }
    });

    const instances = res.Result?.PlayInstanceInfo?.ByteInstances;
    if (!instances || instances.length === 0) {
      throw new Error("找不到点播域名，您也可以手动输入点播域名");
    }
    const list = []
    for (const item of instances) {
      for (const domain of item.Domains) {
        list.push({
          value: item.Domain,
          label: item.Domain,
          domain: domain.Domain
        });
      }
    }
    return this.ctx.utils.options.buildGroupOptions(list, this.certDomains);
  }
}

new VolcengineDeployToVOD();
