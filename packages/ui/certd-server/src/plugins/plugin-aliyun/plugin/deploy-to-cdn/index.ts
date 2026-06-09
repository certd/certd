import { optionsUtils } from "@certd/basic";
import { AbstractTaskPlugin, CertTargetItem, IsTaskPlugin, Pager, PageSearch, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { CertApplyPluginNames, CertReader } from "@certd/plugin-cert";
import { CertInfo, createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { AliyunAccess } from "../../../plugin-lib/aliyun/access/index.js";
import { AliyunClient, AliyunSslClient, CasCertId } from "../../../plugin-lib/aliyun/lib/index.js";
@IsTaskPlugin({
  name: "DeployCertToAliyunCDN",
  title: "阿里云-部署证书至CDN",
  icon: "svg:icon-aliyun",
  group: pluginGroups.aliyun.key,
  desc: "自动部署域名证书至阿里云CDN",
  runStrategy: RunStrategy.AlwaysRun,
  // default: {
  //   strategy: {
  //     runStrategy: RunStrategy.SkipWhenSucceed,
  //   },
  // },
})
export class DeployCertToAliyunCDN extends AbstractTaskPlugin {
  @TaskInput({
    title: "证书服务接入点",
    helper: "不会选就按默认",
    value: "cas.aliyuncs.com",
    component: {
      name: "a-select",
      options: [
        { value: "cas.aliyuncs.com", label: "中国大陆" },
        { value: "cas.ap-southeast-1.aliyuncs.com", label: "新加坡" },
        { value: "cas.eu-central-1.aliyuncs.com", label: "德国（法兰克福）" },
      ],
    },
    required: true,
  })
  endpoint!: string;

  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "uploadCertToAliyun"],
    },
    template: false,
    required: true,
  })
  cert!: CertInfo | CasCertId | number;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "Access授权",
    helper: "阿里云授权AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "aliyun",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "证书所在地域",
    helper: "cn-hangzhou和ap-southeast-1，默认cn-hangzhou。国际站用户建议使用ap-southeast-1。",
    value: "cn-hangzhou",
    component: {
      name: "a-select",
      options: [
        { value: "cn-hangzhou", label: "中国大陆" },
        { value: "ap-southeast-1", label: "新加坡" },
      ],
    },
    required: true,
  })
  certRegion: string;

  @TaskInput({
    title: "证书名称",
    helper: "上传后将以此名称作为前缀备注",
  })
  certName!: string;

  @TaskInput({
    title: "域名匹配模式",
    helper: "根据证书匹配：根据证书域名自动匹配DCDN加速域名自动部署，新增加速域名自动感知，自动新增部署",
    component: {
      name: "a-select",
      options: [
        { label: "手动选择", value: "manual" },
        { label: "根据证书匹配", value: "auto" },
      ],
    },
    value: "manual",
  })
  domainMatchMode!: "manual" | "auto";

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "CDN加速域名",
      helper: "你在阿里云上配置的CDN加速域名，比如:certd.docmirror.cn",
      typeName: "DeployCertToAliyunCDN",
      action: DeployCertToAliyunCDN.prototype.onGetDomainList.name,
      watches: ["certDomains", "accessId"],
      required: true,
      pageSize: 100,
      search: true,
      mergeScript: `
        return {
          show: ctx.compute(({form})=>{
            return form.domainMatchMode === "manual"
          })
        }
      `,
      pager: true,
    })
  )
  domainName!: string | string[];

  @TaskOutput({
    title: "已部署过的DCDN加速域名",
  })
  deployedList!: string[];

  async onInstance() {}
  async execute(): Promise<any> {
    this.logger.info("开始部署证书到阿里云cdn");
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    if (this.cert == null) {
      throw new Error("域名证书参数为空，请检查前置任务");
    }

    const client = await this.getClient(access);
    const sslClient = new AliyunSslClient({
      access,
      logger: this.logger,
      endpoint: this.endpoint || "cas.aliyuncs.com",
    });

    if (this.domainMatchMode === "auto") {
      const { result, deployedList } = await this.autoMatchedDeploy({
        targetName: "DCDN加速域名",
        uploadCert: async () => {
          return await sslClient.uploadCertOrGet(this.cert);
        },
        deployOne: async (req: { target: CertTargetItem; cert: any }) => {
          return await this.deployOne(client, req.target.value, req.cert);
        },
        getCertDomains: async () => {
          return sslClient.getCertDomains(this.cert);
        },
        getDeployTargetList: this.onGetDomainList.bind(this),
      });
      this.deployedList = deployedList;
      return result;
    } else {
      if (this.isNotChanged()) {
        this.logger.info("输入参数未变更，跳过");
        return "skip";
      }
      const certId = await this.getOrUploadCasCert(sslClient);

      if (typeof this.domainName === "string") {
        this.domainName = [this.domainName];
      }
      for (const domain of this.domainName) {
        await this.deployOne(client, domain, certId);
      }
    }

    this.logger.info("部署完成");
  }

  async getOrUploadCasCert(sslClient: AliyunSslClient) {
    let certId: any = this.cert;
    let certName = this.appendTimeSuffix(this.certName);
    if (typeof this.cert === "object") {
      const certInfo = this.cert as CertInfo;
      const casCert = this.cert as CasCertId;
      if (casCert.certId) {
        certId = casCert.certId;
      } else if (certInfo.crt) {
        certName = CertReader.buildCertName(certInfo);
        const certIdRes = await sslClient.uploadCertificate({
          name: certName,
          cert: certInfo,
        });
        certId = certIdRes.certId as any;
      } else {
        throw new Error("证书格式错误" + JSON.stringify(this.cert));
      }
    }

    return {
      certId,
      certName,
    };
  }

  async deployOne(client: any, domain: string, cert: any) {
    const { certId, certName } = cert;
    await this.SetCdnDomainSSLCertificate(client, {
      CertId: certId,
      DomainName: domain,
      CertName: certName,
      CertRegion: this.certRegion || "cn-hangzhou",
    });
  }

  async getClient(access: AliyunAccess) {
    const client = new AliyunClient({ logger: this.logger });
    await client.init({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      endpoint: "https://cdn.aliyuncs.com",
      apiVersion: "2018-05-10",
    });
    return client;
  }

  async SetCdnDomainSSLCertificate(client: any, params: { CertId: number; DomainName: string; CertName: string; CertRegion: string }) {
    this.logger.info("设置CDN: ", JSON.stringify(params));
    const requestOption = {
      method: "POST",
      formatParams: false,
    };

    const ret: any = await client.request(
      "SetCdnDomainSSLCertificate",
      {
        SSLProtocol: "on",
        CertType: "cas",
        ...params,
      },
      requestOption
    );
    this.checkRet(ret);
    this.logger.info(`设置CDN: ${params.DomainName} 证书成功:`, ret.RequestId);
  }

  checkRet(ret: any) {
    if (ret.Code != null) {
      throw new Error("执行失败：" + ret.Message);
    }
  }

  async onGetDomainList(data: PageSearch) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await this.getClient(access);

    const pager = new Pager(data);
    const params = {
      DomainName: data.searchKey,
      PageSize: pager.pageSize || 100,
      PageNumber: pager.pageNo || 1,
      DomainSearchType: "fuzzy_match",
    };

    const requestOption = {
      method: "POST",
      formatParams: false,
    };

    const res = await client.request("DescribeUserDomains", params, requestOption);
    this.checkRet(res);
    const pageData = res?.Domains?.PageData;
    if (!pageData || pageData.length === 0) {
      return {
        list: [],
        total: 0,
      };
    }
    const total = res?.TotalCount || 0;
    const options = pageData.map((item: any) => {
      return {
        value: item.DomainName,
        label: item.DomainName,
        domain: item.DomainName,
      };
    });
    return {
      list: optionsUtils.buildGroupOptions(options, this.certDomains),
      total,
    };
  }
}
new DeployCertToAliyunCDN();
