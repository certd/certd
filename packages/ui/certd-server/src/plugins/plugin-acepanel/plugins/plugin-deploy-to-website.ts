import { IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import { AcePanelAccess } from "../access.js";

@IsTaskPlugin({
  name: "AcePanelDeployToWebsite",
  title: "AcePanel-部署到网站",
  desc: "上传证书并部署到指定网站",
  icon: "svg:icon-lucky",
  group: pluginGroups.panel.key,
  needPlus: true,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class AcePanelDeployToWebsite extends AbstractPlusTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "ACEPanel授权",
    component: {
      name: "access-selector",
      type: "acepanel",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "部署网站",
      helper: "选择需要部署证书的网站",
      action: AcePanelDeployToWebsite.prototype.onGetWebsiteList.name,
      pager: false,
      search: false,
    })
  )
  websiteList!: number[];

  async onInstance() {}

  async onGetWebsiteList(data: PageSearch = {}) {
    const access = await this.getAccess<AcePanelAccess>(this.accessId);
    const res = await access.getWebSiteList(data);
    const items = res.data.items;
    if (!items || items.length === 0) {
      throw new Error("没有找到网站");
    }
    const options = items.map((item: any) => {
      return {
        label: `${item.name} (${item.domains.join(", ")})`,
        value: item.id,
        domain: item.domains,
      };
    });
    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
    };
  }

  async execute(): Promise<void> {
    const access = await this.getAccess<AcePanelAccess>(this.accessId);

    // 上传证书
    this.logger.info("开始上传证书");
    const result = await access.uploadCert(this.cert.crt, this.cert.key);
    const certId = result.data.id;
    this.logger.info(`证书上传成功，证书ID：${certId}`);
    this.logger.info(`证书域名：${result.data.domains.join(", ")}`);

    // 部署证书到选择的网站
    if (this.websiteList && this.websiteList.length > 0) {
      this.logger.info(`开始部署证书到 ${this.websiteList.length} 个网站`);
      for (const websiteId of this.websiteList) {
        this.logger.info(`部署证书到网站ID：${websiteId}`);
        await access.deployCert(certId, websiteId);
        this.logger.info(`证书部署到网站ID：${websiteId} 成功`);
      }
    }

    this.logger.info("部署完成");
  }
}

new AcePanelDeployToWebsite();
