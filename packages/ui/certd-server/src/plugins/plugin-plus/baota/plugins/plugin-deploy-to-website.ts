import { HttpClient } from "@certd/basic";
import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";

import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { BaotaClient } from "../lib/client.js";
import { createCertDomainGetterInputDefine } from "@certd/plugin-lib";
import { uniq } from "lodash-es";

export type SiteItem = {
  value: string;
  label: string;
  domain: string;
};
@IsTaskPlugin({
  name: "BaotaDeployWebSiteCert",
  title: "宝塔-网站证书部署",
  icon: "svg:icon-bt",
  group: pluginGroups.panel.key,
  desc: "部署宝塔管理的站点的ssl证书，目前支持宝塔网站站点、docker站点等。本插件也支持aaPanel。",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class BaotaDeployWebSiteCert extends AbstractTaskPlugin {
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

  @TaskInput({
    title: "是否Docker站点",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "是否为docker站点",
    required: true,
  })
  isDockerSite = false;

  //证书选择，此项必须要有
  @TaskInput({
    title: "站点名称",
    component: {
      name: "remote-select",
      vModel: "value",
      mode: "tags",
      action: "GetSiteList",
      watches: ["certDomains", "accessId", "isDockerSite"],
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
    helper: "将会自动获取证书匹配的站点名称\n宝塔版本低于9.0.0时，此处会获取失败，忽略错误，手动输入站点域名即可",
  })
  siteName!: string | string[];

  async onInstance() {}
  async execute(): Promise<void> {
    const { cert, accessId } = this;
    const access = await this.getAccess(accessId);
    const http: HttpClient = this.ctx.http;
    const client = new BaotaClient(access, http);
    this.logger.info(`siteName:${this.siteName}`);

    const siteNames = [];
    if (typeof this.siteName === "string") {
      siteNames.push(this.siteName);
    } else {
      siteNames.push(...this.siteName);
    }

    const lockKey = `baota-lock-${accessId}`;

    for (const site of siteNames) {
      // 加锁，防止并发部署证书， 宝塔并发部署会导致nginx的conf错乱
      await this.ctx.utils.locker.execute(lockKey, async () => {
        this.logger.info(`为站点:${site}设置证书，目前支持宝塔网站站点、docker站点`);
        if (this.isDockerSite) {
          const res = await client.doRequest("/mod/docker/com/set_ssl", "", {
            site_name: site,
            key: cert.key,
            csr: cert.crt,
          });
          this.logger.info(res?.msg);
        } else {
          const res = await client.doRequest("/site", "SetSSL", {
            type: 0,
            siteName: site,
            key: cert.key,
            csr: cert.crt,
          });
          this.logger.info(res?.msg);
        }
      });
    }

    //上传证书
    // const uploadCertUrl = "/ssl/cert/save_cert";
    // const uploadCertData = {
    //   csr: cert.crt,
    //   key: cert.key,
    // };
    // const uploadCertRes = await client.doRequest(uploadCertUrl, null, uploadCertData, {
    //   skipCheckRes: true,
    // });
    // if (uploadCertRes.msg === "证书已存在") {
    //   this.logger.info(`证书已存在:${JSON.stringify(uploadCertRes)}`);
    // } else if (uploadCertRes.status === false) {
    //   this.logger.info(`上传证书失败:${JSON.stringify(uploadCertRes)}`);
    // } else {
    //   this.logger.info(`上传证书成功:${JSON.stringify(uploadCertRes)}`);
    // }

    // const certHash = this.ctx.utils.hash.md5(cert.crt + "\n");
    // for (const site of siteNames) {
    //   const url = "/ssl/cert/SetCertToSite";
    //   const data = {
    //     siteName: site,
    //     ssl_hash: certHash,
    //   };
    //   this.logger.info(`开始部署站点【${site}】的证书:${JSON.stringify(data)}`);
    //   const res = await client.doRequest(url, null, data);
    //   this.logger.info(`站点【${site}】部署证书成功：${res.msg}`);
    // }

    // const batchInfo = [];
    // for (const site of siteNames) {
    //   batchInfo.push({
    //     ssl_hash: certHash,
    //     siteName: site,
    //     certName: this.certDomains[0],
    //   });
    // }
    // const batchInfoStr = JSON.stringify(batchInfo);
    // const data = { BatchInfo: batchInfoStr };
    // this.logger.info("body=", data);
    // const res = await client.doRequest("/ssl", "SetBatchCertToSite", data);
    // if (res.failed > 0) {
    //   throw new Error(`部署失败:${JSON.stringify(res)}`);
    // }
    // this.logger.info(`部署成功：${JSON.stringify(res)}`);
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
      const url = "/ssl?action=GetSiteDomain";
      const data = {
        cert_list: JSON.stringify(domains),
      };
      const res = await client.doRequest(url, null, data, { skipCheckRes: false });
      this.logger.info(res);
      all = res.all || [];
    };

    //查找docker 站点
    const getDockerSite = async () => {
      const url2 = "/mod/docker/com/get_site_list";
      const res2 = await client.doRequest(url2, null, {});
      this.logger.info(res2);
      if (res2.data) {
        const dockerDomains = res2.data.map(item => {
          return item.name;
        });
        all = [...all, ...dockerDomains];
        all = uniq(all);
      }
    };

    if (this.isDockerSite) {
      await getDockerSite();
    } else {
      await getPhpSite();
    }

    if (!all || all.length === 0) {
      throw new Error("未找到站点，你可以手动输入");
    }
    const options: SiteItem[] = [];
    for (const item of all) {
      options.push({
        value: item,
        label: item,
        domain: item,
      });
    }
    return this.ctx.utils.options.buildGroupOptions(options, domains);
  }
}
new BaotaDeployWebSiteCert();
