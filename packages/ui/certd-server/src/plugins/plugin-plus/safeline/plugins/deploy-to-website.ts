import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { HttpRequestConfig } from "@certd/basic";

import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { SafelineAccess } from "../access.js";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";

@IsTaskPlugin({
  name: "SafelineDeployToWebsitePlugin",
  title: "雷池-更新证书（支持控制台和防护应用）",
  icon: "svg:icon-safeline",
  desc: "更新长亭雷池WAF的证书，支持更新控制台和防护应用的证书。",
  group: pluginGroups.panel.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class SafelineDeployToWebsitePlugin extends AbstractTaskPlugin {
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

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "雷池授权",
    helper: "长亭雷池授权",
    component: {
      name: "access-selector",
      type: "safeline",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "雷池证书",
      typeName: "SafelineDeployToWebsitePlugin",
      action: SafelineDeployToWebsitePlugin.prototype.onGetCertIds.name,
      helper: "请选择要更新的雷池的证书Id，需要先手动到雷池控制台上传一次",
      required: true,
    })
  )
  certIds!: number[];

  access: SafelineAccess;
  async onInstance() {
    this.access = await this.getAccess(this.accessId);
  }
  async execute(): Promise<void> {
    for (const certId of this.certIds) {
      await this.uploadCert(certId);
    }
    this.logger.info("雷池证书更新完成");
  }

  async uploadCert(certId: number) {
    await this.doRequest({
      url: "/api/open/cert",
      method: "post",
      data: {
        id: certId,
        manual: {
          crt: this.cert.crt,
          key: this.cert.key,
        },
        type: 2,
      },
    });
    this.logger.info(`证书<${certId}>更新成功`);
  }

  async doRequest(config: HttpRequestConfig<any>) {
    config.baseURL = this.access.baseUrl;
    config.skipSslVerify = this.access.skipSslVerify ?? false;
    config.logRes = false;
    config.logParams = false;
    config.headers = {
      "X-SLCE-API-TOKEN": this.access.apiToken,
    };
    const res = await this.ctx.http.request(config);
    if (!res.err) {
      return res.data;
    }
    throw new Error(res.msg);
  }

  // requestHandle

  async onGetCertIds() {
    const res = await this.doRequest({
      url: "/api/open/cert",
      method: "get",
      data: {},
    });
    const nodes = res?.nodes;
    if (!nodes || nodes.length === 0) {
      throw new Error("没有找到证书，请先在雷池控制台中手动上传证书，并关联防护站点，后续才可以自动更新");
    }
    const options = nodes.map(item => {
      return {
        label: `<${item.id}>${item.domains.join(",")}`,
        value: item.id,
        domain: item.domains,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}
new SafelineDeployToWebsitePlugin();
