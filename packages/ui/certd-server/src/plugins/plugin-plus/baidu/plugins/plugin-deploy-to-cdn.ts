import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import { BaiduYunCertClient, BaiduYunClient } from "../client.js";
import { createCertDomainGetterInputDefine } from "@certd/plugin-lib";

@IsTaskPlugin({
  name: "BaiduDeployToCDN",
  title: "百度云-部署证书到CDN",
  icon: "ant-design:baidu-outlined",
  group: pluginGroups.baidu.key,
  desc: "部署到百度云CDN",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class BaiduDeployToCDNPlugin extends AbstractTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "BaiduUploadCert"],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine())
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "百度云授权",
    helper: "百度云授权",
    component: {
      name: "access-selector",
      type: "baidu",
    },
    required: true,
  })
  accessId!: string;

  //证书选择，此项必须要有
  @TaskInput({
    title: "CDN域名",
    component: {
      name: "remote-select",
      vModel: "value",
      mode: "tags",
      action: "GetDomainList",
      watches: ["certDomains", "accessId"],
    },
    required: true,
  })
  domains!: string[];

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.getAccess(this.accessId);
    const client = new BaiduYunClient({
      access,
      logger: this.logger,
      http: this.ctx.http,
    });

    const certClient = new BaiduYunCertClient({
      access,
      logger: this.logger,
      http: this.ctx.http,
    });

    let certId = this.cert as string;
    if (typeof this.cert !== "string") {
      this.logger.info("上传证书到百度云");
      const res = await certClient.createCert({
        cert: this.cert,
        certName: CertReader.buildCertName(this.cert),
      });
      certId = res.certId;
      this.logger.info(`上传证书到百度云成功:${certId}`);
    }

    const body = {
      https: {
        enabled: true,
        certId: certId,
      },
    };
    for (const domain of this.domains) {
      await client.doRequest({
        host: "cdn.baidubce.com",
        uri: `/v2/domain/${domain}/config`,
        body,
        query: {
          https: "",
        },
        method: "put",
      });
      this.logger.info(`部署证书到${domain}成功`);
    }
  }

  async onGetDomainList() {
    // if (!isPlus()) {
    //   throw new Error("自动获取站点列表为专业版功能，您可以手动输入站点域名/站点名称进行部署");
    // }
    const access = await this.getAccess(this.accessId);
    const client = new BaiduYunClient({
      access,
      logger: this.logger,
      http: this.ctx.http,
    });

    const res = await client.doRequest({
      host: "cdn.baidubce.com",
      uri: `/v2/domain`,
      method: "GET",
      query: {
        maxItems: 1000,
      },
    });

    const list = res.domains;

    if (!list || list.length === 0) {
      throw new Error("未找到加速域名，你可以手动输入");
    }
    const options: any[] = [];
    for (const item of list) {
      options.push({
        value: item.name,
        label: item.name,
        domain: item.name,
      });
    }
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}

new BaiduDeployToCDNPlugin();
