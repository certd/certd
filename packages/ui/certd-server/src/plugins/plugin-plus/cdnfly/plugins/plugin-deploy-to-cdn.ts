import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CdnflyAccess } from "../access.js";

@IsTaskPlugin({
  name: "CdnflyDeployToCDN",
  title: "cdnfly-部署证书到cdnfly",
  icon: "majesticons:cloud-line",
  group: pluginGroups.cdn.key,
  desc: "cdnfly",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class CdnflyDeployToCDNPlugin extends AbstractTaskPlugin {
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

  @TaskInput(
    createCertDomainGetterInputDefine({
      props: { required: false },
    })
  )
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "cdnfly授权",
    helper: "cdnfly授权",
    component: {
      name: "access-selector",
      type: "cdnfly",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "自动匹配站点",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "是否自动匹配站点进行部署\n如果选择自动匹配，则下方参数无需填写",
  })
  autoMatch!: boolean;

  //测试参数
  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书ID",
      helper: "请选择证书Id，需要先手动上传一次证书，后续可以自动更新证书【推荐】",
      search: true,
      typeName: "CdnflyDeployToCDNPlugin",
      action: CdnflyDeployToCDNPlugin.prototype.onGetCertList.name,
      watches: ["cert", "accessId"],
      required: false,
    })
  )
  certId!: number | number[];

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "网站Id",
      helper: "请选择要部署证书的网站Id",
      search: true,
      action: CdnflyDeployToCDNPlugin.prototype.onGetSiteList.name,
      watches: ["url", "cert", "accessId"],
      required: false,
    })
  )
  siteId!: number[];

  access: CdnflyAccess;

  uploadCertId!: number;

  async onInstance() {
    this.access = await this.getAccess<CdnflyAccess>(this.accessId);
  }

  async execute(): Promise<void> {
    const { cert, siteId, certId } = this;
    if (this.autoMatch) {
      this.logger.info(`自动匹配站点更新证书`);
      await this.updateByDomain();
      return;
    }

    if (certId != null) {
      let certIds = certId as number[];
      if (!Array.isArray(certId)) {
        certIds = [certId];
      }
      for (const item of certIds) {
        await this.updateByCertId(cert, item);
      }
    }
    if (siteId != null) {
      let siteIds = siteId as number[];
      if (!Array.isArray(siteId)) {
        siteIds = [siteId];
      }
      for (const item of siteIds) {
        await this.updateBySiteId(cert, item);
      }
    }
  }

  private async updateByCertId(cert: CertInfo, certId: number | number[]) {
    this.logger.info(`更新证书，证书ID:${certId}`);
    const url = `/v1/certs/${certId}`;
    await this.doRequest(url, "PUT", {
      cert: cert.crt,
      key: cert.key,
    });
  }

  async doRequest(url: string, method: string, data: any) {
    return await this.access.doRequest({
      url: url,
      method: method,
      data: data,
    });
  }

  private async updateByDomain() {
    //查询站点
    const sites = await this.querySite();
    for (const row of sites) {
      const domains = row.domain.split(" ");
      if (this.ctx.utils.domain.match(domains, this.certDomains)) {
        this.logger.info(`站点:${row.id},${row.domain},域名已匹配`);
        await this.updateBySiteId(this.cert, row.id);
      } else {
        this.logger.info(`站点:${row.id},${row.domain},域名未匹配`);
      }
    }
  }

  private async updateBySiteId(cert: CertInfo, siteId: any) {
    const siteInfoUrl = `/v1/sites/${siteId}`;
    const site = await this.doRequest(siteInfoUrl, "GET", {});
    if (!site) {
      throw new Error(`站点:${siteId}不存在`);
    }
    this.logger.info(`更新站点证书:${siteId}`);

    const data = site.data;
    let https_listen = data.https_listen;
    if (https_listen && typeof https_listen === "string") {
      https_listen = JSON.parse(https_listen);
    }
    if (https_listen?.cert) {
      //该网站已有证书id
      const certId = https_listen.cert;
      this.logger.info(`该站点已有证书，更新证书，证书ID:${certId}`);
      await this.updateByCertId(cert, certId);
      return;
    }
    if (!this.uploadCertId) {
      //创建证书
      this.logger.info(`创建证书，域名:${this.certDomains}`);
      const certUrl = `/v1/certs`;
      const name = this.buildCertName(this.certDomains[0]);
      await this.doRequest(certUrl, "POST", {
        name,
        type: "custom",
        cert: cert.crt,
        key: cert.key,
      });

      const certs: any = await this.doRequest(certUrl, "GET", {
        name,
      });
      this.uploadCertId = certs.data[0].id;
    }

    const siteUrl = `/v1/sites`;
    await this.doRequest(siteUrl, "PUT", { id: site.id, https_listen: { cert: this.uploadCertId } });
  }

  async querySite(domain?: string) {
    const siteUrl = `/v1/sites`;
    const query: any = {
      limit: 100,
    };
    if (domain) {
      query.domain = domain;
    }
    const res = await this.doRequest(siteUrl, "GET", query);
    return res.data;
  }

  async queryCert(domain?: string) {
    const certUrl = `/v1/certs`;
    const query: any = {
      limit: 100,
    };
    if (domain) {
      query.domain = domain;
    }
    const res = await this.doRequest(certUrl, "GET", query);
    return res.data;
  }

  async onGetSiteList(data: { searchKey: string }) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }

    const list = await this.querySite(data?.searchKey);
    if (!list || list.length === 0) {
      throw new Error("没有找到任何站点，您可以手动输入网站Id");
    }

    const options = list.map((item: any) => {
      return {
        label: `${item.id}<${item.domain}>`,
        value: item.id,
        domain: item.domain.split(" "),
      };
    });

    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }

  async onGetCertList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }

    const list = await this.queryCert(data?.searchKey);
    if (!list || list.length === 0) {
      throw new Error("没有找到证书列表，您可以手动输入证书Id");
    }
    const options = list.map((item: any) => {
      return {
        label: `${item.id}<${item.domain}>`,
        value: item.id,
        domain: item.domain.split(" "),
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}

new CdnflyDeployToCDNPlugin();
