import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import { VolcengineAccess } from "../access.js";
import { VolcengineClient } from "../ve-client.js";

@IsTaskPlugin({
  name: "VolcengineDeployToDCDN",
  title: "火山引擎-部署证书至DCDN",
  icon: "svg:icon-volcengine",
  group: pluginGroups.volcengine.key,
  desc: "部署至火山引擎全站加速",
  // showRunStrategy: true,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class VolcengineDeployToDCDN extends AbstractTaskPlugin {
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
    title: "自动匹配",
    helper: "是否根据证书自动匹配合适的DCDN域名进行部署",
    value: false,
    component: {
      name: "a-switch",
      type: "checked",
    },
    required: true,
  })
  autoMatch!: boolean;

  @TaskInput({
    title: "Access授权",
    helper: "火山引擎AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "volcengine",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "DCDN域名",
      helper: "选择要部署证书的DCDN域名",
      action: VolcengineDeployToDCDN.prototype.onGetDomainList.name,
      watches: ["certDomains", "accessId"],
      required: true,
      mergeScript: `
             return {
                show: ctx.compute(({form})=>{
                  return !form.autoMatch
                })
             }
            `,
    })
  )
  domainList!: string | string[];

  async onInstance() {}

  async uploadCert(client: VolcengineClient) {
    const certService = await client.getCertCenterService();
    let certId = this.cert;
    if (typeof certId !== "string") {
      const certInfo = this.cert as CertInfo;
      this.logger.info(`开始上传证书`);
      certId = await certService.ImportCertificate({
        certName: this.appendTimeSuffix("certd"),
        cert: certInfo,
      });
      this.logger.info(`上传证书成功:${certId}`);
    } else {
      this.logger.info(`使用已有证书ID:${certId}`);
    }
    return certId;
  }

  async execute(): Promise<void> {
    this.logger.info("开始部署证书到火山引擎DCDN");

    const client = await this.getClient();
    const certId = await this.uploadCert(client);

    const service = await client.getDCDNService();

    this.certDomains = new CertReader(this.cert).getAllDomains();

    let domainList = this.domainList;
    if (!this.autoMatch) {
      //手动根据域名部署
      if (!this.domainList || this.domainList.length === 0) {
        throw new Error("域名列表不能为空");
      }
    } else {
      //自动匹配
      const options = await this.getDomainOptions(service);
      const grouped = this.ctx.utils.options.groupByDomain(options, this.certDomains);

      const matched = grouped.matched;

      domainList = matched.map(item => item.domain);

      if (domainList.length === 0) {
        this.logger.warn("没有匹配到域名，跳过部署");
        this.logger.info("当前证书域名：", this.certDomains);
        this.logger.info(
          "当前DCDN域名：",
          grouped.notMatched.map(item => item.domain)
        );
        return;
      }
    }

    //域名十个十个的分割
    for (let i = 0; i < domainList.length; i += 10) {
      const batch = domainList.slice(i, i + 10);
      this.logger.info(`开始部署证书到域名:${batch}`);
      const res = await service.request({
        action: "CreateCertBind",
        method: "POST",
        body: {
          DomainNames: batch,
          CertSource: "volc",
          CertId: certId,
        },
        version: "2021-04-01",
      });
      this.logger.info(`部署证书到域名成功：`, JSON.stringify(res));
    }

    this.logger.info("部署完成");
  }

  async getClient() {
    const access = await this.getAccess<VolcengineAccess>(this.accessId);

    return new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http,
    });
  }

  async onGetDomainList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }

    const client = await this.getClient();
    const service = await client.getDCDNService();
    const options = await this.getDomainOptions(service);
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }

  private async getDomainOptions(service: any) {
    const res = await service.request({
      method: "POST",
      action: "DescribeUserDomains",
      body: {
        PageSize: 1000,
      },
    });

    const list = res.Result?.Domains;
    if (!list || list.length === 0) {
      throw new Error("找不到DCDN域名，您也可以手动输入域名");
    }
    const options = list.map((item: any) => {
      return {
        value: item.Domain,
        label: `${item.Domain}<${item.Scope}>`,
        domain: item.Domain,
      };
    });
    return options;
  }
}

new VolcengineDeployToDCDN();
