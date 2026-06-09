import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo } from "@certd/plugin-cert";
import { DogeClient } from "../../lib/index.js";
import dayjs from "dayjs";
import { CertApplyPluginNames } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
@IsTaskPlugin({
  name: "DogeCloudDeployToCDN",
  title: "多吉云-部署到多吉云CDN",
  icon: "svg:icon-dogecloud",
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DogeCloudDeployToCDNPlugin extends AbstractTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "证书",
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
    title: "多吉云授权",
    helper: "多吉云AccessKey",
    component: {
      name: "access-selector",
      type: "dogecloud",
    },
    rules: [{ required: true, message: "此项必填" }],
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "CDN域名",
      helper: "请选择CDN域名，可以选择多个，一次性部署",
      required: true,
      action: DogeCloudDeployToCDNPlugin.prototype.onGetDomainList.name,
      pager: false,
      search: false,
    })
  )
  domain!: string | string[];

  @TaskInput({
    title: "忽略部署接口报错",
    helper: "当该域名部署后报错，但是实际上已经部署成功时，可以勾选",
    value: false,
    component: {
      name: "a-switch",
      type: "checked",
    },
  })
  ignoreDeployNullCode = false;

  dogeClient!: DogeClient;

  async onInstance() {
    const access = await this.getAccess(this.accessId);
    this.dogeClient = new DogeClient(access, this.ctx.http, this.ctx.logger);
  }
  async execute(): Promise<void> {
    const certId: number = await this.updateCert();

    let domains = this.domain;
    if (typeof domains === "string") {
      domains = [domains];
    }
    for (const domain of domains) {
      this.ctx.logger.info(`绑定证书${certId}到域名${domain}`);
      await this.bindCert(certId, domain);
    }
    this.logger.info("执行完成，3秒后删除过期证书");

    await this.ctx.utils.sleep(3000);
    await this.clearExpiredCert();
  }

  async updateCert() {
    const data = await this.dogeClient.request("/cdn/cert/upload.json", {
      note: "certd-" + dayjs().format("YYYYMMDDHHmmss"),
      cert: this.cert.crt,
      private: this.cert.key,
    });
    return data.id;
  }

  async bindCert(certId: number, domain: string) {
    await this.dogeClient.request(
      "/cdn/cert/bind.json",
      {
        id: certId,
        domain: domain,
      },
      this.ignoreDeployNullCode
    );
  }

  async clearExpiredCert() {
    const res = await this.dogeClient.request("/cdn/cert/list.json", {});
    const list = res.certs?.filter((item: any) => item.expire < dayjs().unix() && item.domainCount === 0) || [];
    for (const item of list) {
      this.ctx.logger.info(`删除过期证书${item.id}->${item.domain}`);
      try {
        await this.dogeClient.request("/cdn/cert/delete.json", {
          id: item.id,
        });
      } catch (err) {
        this.ctx.logger.warn(`删除过期证书${item.id}->${item.domain}失败`, err);
      }
    }
  }

  async onGetDomainList(data: PageSearch = {}) {
    const res = await this.dogeClient.request("/cdn/domain/list.json", {});

    const list = res.domains;
    if (!list || list.length === 0) {
      throw new Error("没有找到CDN域名");
    }

    const options = list.map((item: any) => {
      return {
        label: `${item.name}`,
        value: item.name,
        domain: item.name,
      };
    });
    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
    };
  }
}
new DogeCloudDeployToCDNPlugin();
