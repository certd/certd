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
  i18n: {
    "en-US": {
      title: "AcePanel Deploy to Website Plugin",
      desc: "Deploy AcePanel certificate to website.",
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

  @TaskInput({
    title: "启用HTTPS",
    value: true,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "部署证书时是否同时开启所选网站的HTTPS访问",
    required: true,
  })
  enableHttps = true;

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
    const websiteIds = this.websiteList || [];
    if (websiteIds.length === 0) {
      this.logger.warn("未选择需要部署的网站，跳过证书部署");
      return;
    }

    let enableHttps = this.enableHttps;
    if (enableHttps === undefined) {
      // 兼容旧版流水线数据，未配置该参数时保持新接口默认行为：启用HTTPS
      enableHttps = true;
    }

    // 3.3.2及以上版本才支持website_ids批量部署，旧版本仍然逐个网站部署
    const panelVersion = await access.getPanelVersion();
    const batchDeploySupported = access.isBatchDeploySupported(panelVersion);
    if (batchDeploySupported) {
      this.logger.info(`AcePanel版本${panelVersion}支持批量部署，开始部署证书到 ${websiteIds.length} 个网站，网站ID：${websiteIds.join(", ")}`);
      await access.deployCert(certId, websiteIds, enableHttps);
      this.logger.info(`证书部署成功，网站ID：${websiteIds.join(", ")}`);
    } else {
      this.logger.info(`AcePanel版本${panelVersion || "未知"}不支持批量部署，将逐个网站部署`);
      for (const websiteId of websiteIds) {
        this.logger.info(`部署证书到网站ID：${websiteId}`);
        await access.deployCertToWebsite(certId, websiteId);
        this.logger.info(`证书部署到网站ID：${websiteId} 成功`);
      }
    }

    this.logger.info("部署完成");
  }
}

new AcePanelDeployToWebsite();
