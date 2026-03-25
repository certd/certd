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
  desc: "部署至火山引擎视频点播",
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


  @TaskInput({
    title: "区域",
    helper: "选择火山引擎区域",
    component: {
      name: "select",
      options: [
        { value: "cn-north-1", label: "华北1（北京）" },
        { value: "ap-southeast-1", label: "东南亚1（新加坡）" }
      ]
    },
    default: "cn-north-1",
    required: true
  })
  regionId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "空间名称",
      helper: "选择要部署证书的点播空间",
      action: VolcengineDeployToVOD.prototype.onGetSpaceList.name,
      watches: ["accessId", "regionId"],
      multi:false,
      required: true
    })
  )
  spaceName!: string;

  @TaskInput({
    title: "域名类型",
    helper: "选择域名类型",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "play", label: "点播加速域名" },
        { value: "image", label: "封面加速域名" }
      ]
    },
    value: "play",
    required: true
  })
  domainType!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "域名",
      helper: "选择要部署证书的域名\n需要先在域名管理页面进行证书中心访问授权（即点击去配置SSL证书）",
      action: VolcengineDeployToVOD.prototype.onGetDomainList.name,
      watches: ["certDomains", "accessId", "spaceName", "domainType"],
      required: true
    })
  )
  domainList!: string | string[];


  async onInstance() {
  }

  async execute(): Promise<void> {
    this.logger.info("开始部署证书到火山引擎VOD");
    
    if (!this.spaceName) {
      throw new Error("SpaceName不能为空");
    }
    
    const access = await this.getAccess<VolcengineAccess>(this.accessId);
    let certId = await this.uploadOrGetCertId(access);

    const service = await this.getVodService({ version: "2023-07-01", region: this.regionId });
    const domains = Array.isArray(this.domainList) ? this.domainList : [this.domainList];
    for (const domain of domains) {
      this.logger.info(`开始部署域名${domain}证书`);
      await service.request({
        action: "UpdateDomainConfig",
        method: "POST",
        body: {
          SpaceName: this.spaceName,
          DomainType: this.domainType,
          Domain: domain,
          Config: {
            HTTPS: {
              Switch: true,
              CertInfo: {
                CertId: certId
              }
            }
          }
        }
      });
      this.logger.info(`部署域名${domain}证书成功`);
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


  private async getVodService(req?: { version?: string, region?: string }) {
    const access = await this.getAccess<VolcengineAccess>(this.accessId);

    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http
    });

    return await client.getVodService(req);
  }

  async onGetSpaceList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const service = await this.getVodService({ version: "2021-01-01", region: this.regionId });

    const res = await service.request({
      action: "ListSpace",
      body: {}
    });

    const list = res.Result;
    if (!list || list.length === 0) {
      throw new Error("找不到空间，您可以手动填写");
    }
    return list.map((item: any) => {
      return {
        value: item.SpaceName,
        label: `${item.SpaceName} (${item.Region})`
      };
    });
  }

  async onGetDomainList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    if (!this.spaceName) {
      throw new Error("请先选择空间名称");
    }
    const service = await this.getVodService({ version: "2023-01-01", region: this.regionId });

    const res = await service.request({
      action: "ListDomain",
      query: {
        SpaceName: this.spaceName,
        DomainType: this.domainType
      }
    });

    const instances = res.Result?.PlayInstanceInfo?.ByteInstances;
    if (!instances || instances.length === 0) {
      throw new Error("找不到域名，您也可以手动输入域名");
    }
    const list = [];
    for (const item of instances) {
      if (item.Domains && item.Domains.length > 0) {
        for (const domain of item.Domains) {
          if (domain.Domain) {
            list.push({
              value: domain.Domain,
              label: domain.Domain
            });
          }
        }
      }
    }
    return this.ctx.utils.options.buildGroupOptions(list, this.certDomains);
  }
}

new VolcengineDeployToVOD();
