import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { HuaweiAccess } from "../../access/index.js";
import { CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { resetLogConfigure } from "@certd/basic";
import { CertApplyPluginNames } from "@certd/plugin-cert";
@IsTaskPlugin({
  name: "HauweiDeployCertToCDN",
  title: "华为云-部署证书至CDN",
  icon: "svg:icon-huawei",
  group: pluginGroups.huawei.key,
  desc: "",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class HauweiDeployCertToCDN extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书\n如果你选择使用ccm证书ID，则需要在[域名管理页面右上角开启SCM授权](https://console.huaweicloud.com/cdn/#/cdn/domain)",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "HauweiUploadToCCM"],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "企业项目ID",
    helper: '华为云子账号必填，"all"表示查询所有项目',
    required: false,
    value: "all",
  })
  enterpriseProjectId!: string;

  @TaskInput({
    title: "Access授权",
    helper: "华为云授权AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "huawei",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "CDN域名",
      helper: "请选择域名或输入域名",
      typeName: "HauweiDeployCertToCDN",
      action: HauweiDeployCertToCDN.prototype.onGetDomainList.name,
    })
  )
  domains!: string[];

  async execute(): Promise<void> {
    if (!this.cert) {
      throw new Error("域名证书不能为空");
    }
    this.logger.info("开始部署证书到华为云cdn");
    const { cdn, client } = await this.getCdnClient();
    let httpsConfig = new cdn.HttpPutBody().withHttpsStatus("on").withCertificateType("server");

    if (typeof this.cert === "object") {
      httpsConfig = httpsConfig.withCertificateSource(0).withCertificateName(this.appendTimeSuffix("certd")).withCertificateValue(this.cert.crt).withPrivateKey(this.cert.key);
    } else {
      this.logger.info("使用已有域名证书：", this.cert);
      httpsConfig = httpsConfig
        .withCertificateSource(2) //scm证书
        .withCertificateName(this.appendTimeSuffix("certd"))
        .withScmCertificateId(this.cert);
    }

    const config = new cdn.Configs().withHttps(httpsConfig);
    const body = new cdn.ModifyDomainConfigRequestBody().withConfigs(config);
    if (!this.domains || this.domains.length === 0) {
      throw new Error("您还未配置CDN域名");
    }
    this.logger.info("部署域名：", JSON.stringify(this.domains));
    for (const domain of this.domains) {
      this.logger.info("部署到域名:", domain);

      const queryReq = new cdn.ShowDomainDetailByNameRequest(domain);
      if (this.enterpriseProjectId) {
        queryReq.withEnterpriseProjectId(this.enterpriseProjectId);
      }
      const domainDetail = await client.showDomainDetailByName(queryReq);
      //@ts-ignore
      const status = domainDetail.domain.domainStatus || domainDetail.domain.domain_status;
      this.logger.info(`当前域名状态:`, status);
      let ignoreError = false;
      if (status === "offline") {
        ignoreError = true;
      }
      try {
        const req = new cdn.UpdateDomainFullConfigRequest().withDomainName(domain).withBody(body);
        if (this.enterpriseProjectId) {
          req.withEnterpriseProjectId(this.enterpriseProjectId);
        }
        await client.updateDomainFullConfig(req);
        this.logger.info(`部署到域名${domain}完成:`);
      } catch (e) {
        if (ignoreError) {
          this.logger.warn(`部署到域名${domain}失败，由于其处于offline状态，忽略部署错误，继续执行:`, e);
        } else {
          throw e;
        }
      }
    }

    this.logger.info("部署证书到华为云cdn完成");
  }

  async getCdnClient() {
    const access = await this.getAccess<HuaweiAccess>(this.accessId);
    const { BasicCredentials } = await import("@huaweicloud/huaweicloud-sdk-core");
    const cdn = await import("@huaweicloud/huaweicloud-sdk-cdn/v2/public-api.js");
    //恢复华为云把log4j的config改了的问题
    resetLogConfigure();
    const credentials = new BasicCredentials().withAk(access.accessKeyId).withSk(access.accessKeySecret);
    const client = cdn.CdnClient.newBuilder().withCredential(credentials).withEndpoint("https://cdn.myhuaweicloud.com").build();
    return {
      client,
      cdn,
    };
  }

  async onGetDomainList(data: any) {
    const { client, cdn } = await this.getCdnClient();

    const request = new cdn.ListDomainsRequest();
    request.pageNumber = 1;
    request.pageSize = 1000;
    request.enterpriseProjectId = this.enterpriseProjectId || undefined;
    const result: any = await client.listDomains(request);
    if (!result || !result.domains || result.domains.length === 0) {
      throw new Error("未找到CDN域名，您可以手动输入");
    }

    const domains = result.domains.map(domain => {
      return {
        value: domain.domain_name,
        label: domain.domain_name,
        domain: domain.domain_name,
      };
    });

    return this.ctx.utils.options.buildGroupOptions(domains, this.certDomains);
  }
}
new HauweiDeployCertToCDN();
