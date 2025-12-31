import { HttpClient } from "@certd/basic";
import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";

import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { BaotaClient } from "../lib/client.js";
import { createCertDomainGetterInputDefine } from "@certd/plugin-lib";

type SiteItem = {
  value: string;
  label: string;
  domain: string;
};
@IsTaskPlugin({
  name: "BaotaDeployWebSiteWin",
  title: "宝塔win-网站证书部署",
  icon: "svg:icon-bt",
  group: pluginGroups.panel.key,
  desc: "部署到Windows版宝塔管理的站点的ssl证书",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class BaotaDeployWebSiteWin extends AbstractTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine())
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "宝塔授权",
    helper: "baota的接口密钥",
    component: {
      name: "access-selector",
      type: "baota",
    },
    required: true,
  })
  accessId!: string;

  //证书选择，此项必须要有
  @TaskInput({
    title: "站点Id",
    component: {
      name: "remote-select",
      vModel: "value",
      mode: "tags",
      action: "GetSiteList",
      watches: ["certDomains", "accessId"],
    },
    required: true,
    mergeScript: `
      return {
        component:{
          form: ctx.compute(({form})=>{
            return form
          })
        },
     }
    `,
    helper: "将会自动获取证书匹配的站点名称",
  })
  siteIds!: number[];

  async onInstance() {}
  async execute(): Promise<void> {
    const { cert, accessId } = this;
    const access = await this.getAccess(accessId);
    const http: HttpClient = this.ctx.http;
    const client = new BaotaClient(access, http);
    this.logger.info(`siteIds:${this.siteIds}`);

    const siteIds = this.siteIds ?? [];

    const lockKey = `baota-lock-${accessId}`;
    for (const site of siteIds) {
      await this.ctx.utils.locker.execute(lockKey, async () => {
        this.logger.info(`为站点:${site}设置证书`);
        const res = await client.doWindowsRequest("/site/set_site_ssl", {
          siteid: site,
          status: true,
          sslType: "",
          cert: cert.crt,
          key: cert.key,
        });
        this.logger.info(res?.msg);
      });
    }
  }

  async onGetSiteList() {
    // if (!isPlus()) {
    //   throw new Error("自动获取站点列表为专业版功能，您可以手动输入站点域名/站点名称进行部署");
    // }
    const access = await this.getAccess(this.accessId);
    const http: HttpClient = this.ctx.http;
    const client = new BaotaClient(access, http);

    const domains = this.certDomains;
    let all = [];
    const getPhpSite = async () => {
      const url = "/datalist/get_data_list";
      const data = {
        table: "sites",
        limit: 500,
      };
      const res = await client.doWindowsRequest(url, data, { skipCheckRes: false });
      this.logger.info(res.data);
      all = res.data || [];
    };

    //查找docker 站点

    await getPhpSite();

    if (!all || all.length === 0) {
      throw new Error("未找到站点，你可以手动输入");
    }
    const options: SiteItem[] = [];
    for (const item of all) {
      options.push({
        value: item.id,
        label: `${item.name}<${item.id}>`,
        domain: item.name,
      });
    }
    return this.ctx.utils.options.buildGroupOptions(options, domains);
  }
}
new BaotaDeployWebSiteWin();
