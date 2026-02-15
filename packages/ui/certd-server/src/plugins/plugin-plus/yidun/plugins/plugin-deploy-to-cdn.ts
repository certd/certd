import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { YidunAccess } from "../access.js";

@IsTaskPlugin({
  name: "YidunDeployToCDN",
  title: "易盾-部署到易盾DCDN",
  icon: "material-symbols:shield-outline",
  group: pluginGroups.cdn.key,
  desc: "主要是防御，http://user.yiduncdn.com/",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class YidunDeployToCDNPlugin extends AbstractTaskPlugin {
  //测试参数
  @TaskInput({
    title: "证书ID",
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    helper: "证书ID,在证书管理页面查看，每条记录都有证书id",
  })
  certId!: number;

  @TaskInput({
    title: "网站域名",
    component: {
      name: "a-input",
      vModel: "value",
    },
    helper: "网站域名和证书ID选填其中一个，填了证书ID，则忽略网站域名",
  })
  domain!: number;

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

  //授权选择框
  @TaskInput({
    title: "易盾授权",
    helper: "易盾CDN授权",
    component: {
      name: "access-selector",
      type: "yidun",
    },
    required: true,
  })
  accessId!: string;

  access!: YidunAccess;

  async onInstance() {
    this.access = await this.getAccess<YidunAccess>(this.accessId);
  }
  async execute(): Promise<void> {
    const { domain, certId, cert } = this;
    if (!domain && !certId) {
      throw new Error("证书ID和网站域名必须填写一个");
    }

    if (certId > 0) {
      await this.updateByCertId(cert, certId);
    } else {
      await this.updateByDomain(cert);
    }
  }

  private async updateByCertId(cert: CertInfo, certId: number) {
    this.logger.info(`更新证书，证书ID:${certId}`);
    const url = `http://user.yiduncdn.com/v1/certs/${certId}`;

    const access = await this.getAccess<YidunAccess>(this.accessId);

    await access.doRequest(url, "PUT", {
      cert: cert.crt,
      key: cert.key,
    });
  }

  
  private async updateByDomain(cert: CertInfo) {
    //查询站点
    const siteUrl = "http://user.yiduncdn.com/v1/sites";
    const access = this.access
    const res = await access.doRequest(siteUrl, "GET", { domain: this.domain });
    if (res.data.length === 0) {
      throw new Error(`未找到域名相关站点:${this.domain}`);
    }
    let site = null;
    for (const row of res.data) {
      if (row.domain === this.domain) {
        site = row;
      }
    }
    if (!site) {
      throw new Error(`未找到域名匹配的站点:${this.domain}`);
    }
    if (site.https_listen?.cert) {
      //有证书id
      const certId = site.https_listen.cert;
      await this.updateByCertId(cert, certId);
    } else {
      //创建证书
      this.logger.info(`创建证书，域名:${this.domain}`);
      const certUrl = `http://user.yiduncdn.com/v1/certs`;
      const name = this.domain + "_" + new Date().getTime();
      await access.doRequest(certUrl, "POST", {
        name,
        type: "custom",
        cert: cert.crt,
        key: cert.key,
      });

      const certs: any = await access.doRequest(certUrl, "GET", {
        name,
      });
      const certId = certs.data[0].id;

      const siteUrl = "http://user.yiduncdn.com/v1/sites";
      await access.doRequest(siteUrl, "PUT", { id: site.id, https_listen: { cert: certId } });
    }
  }
}
new YidunDeployToCDNPlugin();
