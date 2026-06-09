import { AbstractTaskPlugin, CertTargetItem, IsTaskPlugin, Pager, PageSearch, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import dayjs from "dayjs";
import { AliyunAccess } from "../../../plugin-lib/aliyun/access/index.js";

import { optionsUtils } from "@certd/basic";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { AliyunClient, AliyunSslClient, CasCertId } from "../../../plugin-lib/aliyun/lib/index.js";
@IsTaskPlugin({
  name: "DeployCertToAliyunDCDN",
  title: "阿里云-部署证书至DCDN",
  icon: "svg:icon-aliyun",
  group: pluginGroups.aliyun.key,
  desc: "依赖证书申请前置任务，自动部署域名证书至阿里云DCDN",
  runStrategy: RunStrategy.AlwaysRun,
  // default: {
  //   strategy: {
  //     runStrategy: RunStrategy.SkipWhenSucceed,
  //   },
  // },
})
export class DeployCertToAliyunDCDN extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "uploadCertToAliyun"],
    },
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
      title: "DCDN加速域名",
      helper: "你在阿里云上配置的DCDN加速域名，比如:certd.docmirror.cn",
      action: DeployCertToAliyunDCDN.prototype.onGetDomainList.name,
      watches: ["certDomains", "accessId"],
      required: true,
      pageSize: 100,
      search: true,
      pager: true,
      mergeScript: `
        return {
          show: ctx.compute(({form})=>{
            return form.domainMatchMode === "manual"
          })
        }
      `,
    })
  )
  domainName!: string | string[];

  @TaskOutput({
    title: "已部署过的DCDN加速域名",
  })
  deployedList!: string[];

  async onInstance() {}
  async execute(): Promise<any> {
    this.logger.info("开始部署证书到阿里云DCDN");
    const access = (await this.getAccess(this.accessId)) as AliyunAccess;
    const client = await this.getClient(access);
    const sslClient = new AliyunSslClient({ access, logger: this.logger });

    if (this.domainMatchMode === "auto") {
      const { result, deployedList } = await this.autoMatchedDeploy({
        targetName: "CDN加速域名",
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

      if (!this.domainName) {
        throw new Error("您还未选择DCDN域名");
      }
      let domains: string[] = [];
      domains = typeof this.domainName === "string" ? [this.domainName] : this.domainName;
      const aliCrtId = await sslClient.uploadCertOrGet(this.cert);
      for (const domainName of domains) {
        await this.deployOne(client, domainName, aliCrtId);
      }
    }

    this.logger.info("部署完成");
  }

  async deployOne(client: any, domainName: string, aliCrtId: CasCertId) {
    this.logger.info(`[${domainName}]开始部署`);
    const params = await this.buildParams(domainName, aliCrtId);
    await this.doRequest(client, params);
    await this.ctx.utils.sleep(1000);
    this.logger.info(`[${domainName}]部署成功`);
  }

  async getClient(access: AliyunAccess) {
    const client = new AliyunClient({ logger: this.logger });
    await client.init({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      endpoint: "https://dcdn.aliyuncs.com",
      apiVersion: "2018-01-15",
    });
    return client;
  }

  async buildParams(domainName: string, aliCrtId: CasCertId) {
    const CertName = (this.certName ?? "certd") + "-" + dayjs().format("YYYYMMDDHHmmss");
    const certId = aliCrtId.certId;
    this.logger.info("使用已上传的证书:", certId);
    return {
      DomainName: domainName,
      SSLProtocol: "on",
      CertType: "cas",
      CertName: CertName,
      CertId: certId,
    };
  }

  async doRequest(client: any, params: any) {
    const requestOption = {
      method: "POST",
      formatParams: false,
    };
    const ret: any = await client.request("SetDcdnDomainSSLCertificate", params, requestOption);
    this.checkRet(ret);
    this.logger.info("设置Dcdn证书成功:", ret.RequestId);
  }

  checkRet(ret: any) {
    if (ret.Code != null) {
      throw new Error("执行失败：" + ret.Message);
    }
  }

  async onGetDomainList(data: PageSearch): Promise<{ list: CertTargetItem[]; total: number }> {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await this.getClient(access);
    const pager = new Pager(data);
    const params = {
      DomainName: data.searchKey,
      PageSize: pager.pageSize || 200,
      PageNumber: pager.pageNo || 1,
      DomainSearchType: "fuzzy_match",
    };

    const requestOption = {
      method: "POST",
      formatParams: false,
    };

    const res = await client.request("DescribeDcdnUserDomains", params, requestOption);
    this.checkRet(res);
    const pageData = res?.Domains?.PageData || [];
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
      total: total,
    };
  }
}
new DeployCertToAliyunDCDN();
