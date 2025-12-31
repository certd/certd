import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";

import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine } from "@certd/plugin-lib";
import { BaotaWafAccess } from "../waf-access.js";

type SiteItem = {
  value: string;
  label: string;
  domain: string;
};
@IsTaskPlugin({
  name: "BaotaDeployWAF",
  title: "宝塔-WAF证书部署",
  icon: "svg:icon-bt",
  group: pluginGroups.panel.key,
  desc: "部署宝塔云WAF/aaWAF",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class BaotaDeployWAF extends AbstractTaskPlugin {
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
    title: "宝塔WAF授权",
    helper: "aaWAF的接口密钥",
    component: {
      name: "access-selector",
      type: "baotawaf",
    },
    required: true,
  })
  accessId!: string;

  //证书选择，此项必须要有
  @TaskInput({
    title: "站点ID",
    component: {
      name: "remote-select",
      vModel: "value",
      mode: "tags",
      action: "onGetSiteList",
      search: true,
      watches: ["certDomains", "accessId"],
    },
    required: true,
    helper: "将会自动获取证书匹配的站点，请选择要部署证书的站点",
  })
  siteIds!: string[];

  async onInstance() {}
  async execute(): Promise<void> {
    const { cert, accessId } = this;
    const access = await this.getAccess<BaotaWafAccess>(accessId);

    const lockKey = `baota-lock-${accessId}`;

    for (const siteId of this.siteIds) {
      this.logger.info(`为站点:${siteId}设置证书`);
      const info = await this.getSiteInfo(access, siteId);
      const listen_ssl_port = info.server.listen_ssl_port;
      await this.ctx.utils.locker.execute(lockKey, async () => {
        await access.doRequest({
          url: "/api/wafmastersite/modify_site",
          data: {
            types: "openCert",
            site_id: siteId,
            server: {
              listen_ssl_port,
              ssl: { is_ssl: 1, full_chain: cert.crt, private_key: cert.key },
            },
          },
        });
      });
      this.logger.info(`站点:${siteId} 证书部署成功`);
    }
    this.logger.info(`部署成功`);
  }

  async getSiteInfo(access: BaotaWafAccess, siteId: string) {
    // /api/wafmastersite/get_site_list
    const res = await access.doRequest({
      url: "/api/wafmastersite/get_site_list",
      data: {
        site_id: siteId,
        p_size: 1,
        p: 1,
        site_name: "",
      },
    });

    if (!res.list || res.list.length === 0) {
      throw new Error(`未找到站点:${siteId}`);
    }
    return res.list[0];
  }

  async onGetSiteList(data: { searchKey?: string }) {
    // if (!isPlus()) {
    //   throw new Error("自动获取站点列表为专业版功能，您可以手动输入站点域名/站点名称进行部署");
    // }
    const access = await this.getAccess<BaotaWafAccess>(this.accessId);

    const res = await access.getSiteList({
      pageNo: 1,
      pageSize: 100,
      query: data.searchKey || "",
    });

    const list = res.list;
    if (!list || list.length === 0) {
      throw new Error("未找到站点，你可以手动输入");
    }
    const options: SiteItem[] = [];
    for (const item of list) {
      options.push({
        value: item.site_id,
        label: `${item.site_name}<${item.site_id}>`,
        domain: item.server.server_name,
      });
    }
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}
new BaotaDeployWAF();
