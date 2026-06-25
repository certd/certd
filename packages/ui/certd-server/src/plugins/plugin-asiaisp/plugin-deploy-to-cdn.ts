import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { AsiaIspAccess } from "./access.js";

@IsTaskPlugin({
  name: "AsiaIspDeployToCDN",
  title: "橙域网络-部署证书到CDN",
  desc: "部署证书到橙域网络(asia-isp) CDN加速域名",
  icon: "clarity:plugin-line",
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class AsiaIspDeployToCDN extends AbstractTaskPlugin {
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

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "橙域网络授权",
    component: {
      name: "access-selector",
      type: "asiaisp",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "加速域名",
      helper: "选择要部署证书的橙域CDN加速域名",
      action: AsiaIspDeployToCDN.prototype.onGetDomainList.name,
      pager: true,
      search: true,
      pageSize: 10,
      single: false,
      watches: ["certDomains", "accessId"],
      required: true,
    })
  )
  domainList!: string[];

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.getAccess<AsiaIspAccess>(this.accessId);
    const client = await access.getClient();

    this.logger.info("开始部署证书到橙域网络CDN");

    // 1. 上传证书到橙域平台
    this.logger.info("上传证书到橙域网络...");
    const certId = await client.uploadCert({
      cert: this.cert,
    });

    // 2. 为每个选中的域名绑定证书
    for (const domain of this.domainList) {
      this.logger.info(`部署证书到域名: ${domain}`);
      await client.deployCertToDomain({
        domain,
        certId,
        protocol: "https",
      });
    }

    this.logger.info(`证书部署完成，共处理 ${this.domainList.length} 个域名`);
  }

  async onGetDomainList(data: PageSearch = {}) {
    const access = await this.getAccess<AsiaIspAccess>(this.accessId);
    const client = await access.getClient();
    const list = await client.getDomainList();

    if (!list || list.length === 0) {
      throw new Error("没有找到加速域名");
    }

    // 客户端过滤：按搜索关键词匹配域名
    let filtered = list;
    const keyword = data.searchKey?.trim().toLowerCase();
    if (keyword) {
      filtered = list.filter((item: any) => item.domain?.toLowerCase().includes(keyword));
    }

    // 客户端分页
    const pageNo = data.pageNo || 1;
    const pageSize = data.pageSize || 10;
    const start = (pageNo - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const options = paged.map((item: any) => {
      return {
        label: `${item.domain}${item.protocol === "https" ? " (HTTPS)" : ""}`,
        value: item.domain,
        domain: item.domain,
      };
    });

    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
      total: filtered.length,
    };
  }
}

new AsiaIspDeployToCDN();
