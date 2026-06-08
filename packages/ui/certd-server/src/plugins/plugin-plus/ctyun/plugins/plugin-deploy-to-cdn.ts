import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { HttpClient } from "@certd/basic";
import { CtyunClient } from "../lib.js";
import { CertApplyPluginNames } from "@certd/plugin-cert";
@IsTaskPlugin({
  name: "CtyunDeployToCDN",
  title: "天翼云-部署证书到CDN",
  icon: "svg:icon-ctyun",
  group: pluginGroups.cdn.key,
  desc: "部署证书到天翼云CDN和全站加速",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class CtyunDeployToCDN extends AbstractTaskPlugin {
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

  @TaskInput({
    title: "产品类型",
    helper: "加速产品类型",
    component: {
      name: "a-select",
      options: [
        /**
         * “001”（静态加速）,“003”:（下载加速）, “004”（视频点播加速）,“008”（CDN加速），“006”（全站加速）,“007”（安全加速） ,“014”（下载加速闲时）
         */
        { label: "静态加速", value: "001" },
        { label: "下载加速", value: "003" },
        { label: "视频点播加速", value: "004" },
        { label: "CDN加速", value: "008" },
        { label: "全站加速", value: "006" },
        { label: "安全加速", value: "007" },
        { label: "下载加速闲时", value: "014" },
      ],
    },
    required: true,
  })
  productCode: string;

  //授权选择框
  @TaskInput({
    title: "天翼云授权",
    helper: "天翼云授权",
    component: {
      name: "access-selector",
      type: "ctyun",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "加速域名",
      helper: "请选择加速域名",
      typeName: "CtyunDeployToCDN",
      action: CtyunDeployToCDN.prototype.onGetDomainList.name,
    })
  )
  domains!: string[];

  async onInstance() {}
  async execute(): Promise<void> {
    /*
    接口描述：调用本接口批量修改加速域名配置信息
请求方式：post
请求路径：/v1/domain/batch_update_configuration_information
使用说明：

修改域名之前，您需要先开通对应产品类型的服务，且保证资源包/按需服务有效；
该域名没有在途工单；
单个用户一分钟限制调用10次
     */

    const access = await this.getAccess(this.accessId);

    const client = new CtyunClient({
      access,
      http: this.ctx.http,
      logger: this.ctx.logger,
    });

    const certName = this.appendTimeSuffix("certd");
    await client.certCreate(certName, this.cert.crt, this.cert.key);
    const uri = "/v1/domain/batch_update_configuration_information";

    const lockKey = `ctyun-deploy-to-cdn-${this.accessId}`;
    await this.ctx.utils.locker.execute(lockKey, async () => {
      const res = await client.doRequest({
        uri,
        method: "post",
        data: {
          domain: this.domains,
          product_code: this.productCode,
          cert_name: certName,
          https_status: "on",
        },
      });

      const domain_details = res.domain_details;
      const errorMessage = "";
      for (const domainDetail of domain_details) {
        // "code":200002,"domain":"ctyun.handfree.work","message":"参数cert_name只在https_status为on时才有效"}
        if (domainDetail.code !== 100000) {
          const thisMessage = `部署失败[${domainDetail.code}]：${domainDetail.domain}:${domainDetail.message}`;
          if (thisMessage.includes("已有进行中的工单") || errorMessage.includes("域名正在操作中")) {
            this.logger.warn(thisMessage);
          }
        }
      }
      if (errorMessage) {
        throw new Error(errorMessage);
      }
      await this.ctx.utils.sleep(5000);
    });

    this.logger.info("部署成功");
  }

  async onGetDomainList() {
    const access = await this.getAccess(this.accessId);
    const http: HttpClient = this.ctx.http;
    const client = new CtyunClient({
      access,
      http,
      logger: this.ctx.logger,
    });

    const all = await client.getDomainList({ productCode: this.productCode });

    if (!all || all.length === 0) {
      throw new Error("未找到加速域名，你可以手动输入");
    }
    const options = all.map(item => {
      return {
        label: item.domain,
        value: item.domain,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}
new CtyunDeployToCDN();
