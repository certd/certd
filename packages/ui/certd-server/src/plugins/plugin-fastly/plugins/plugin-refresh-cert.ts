import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { FastlyAccess } from "../access.js";

@IsTaskPlugin({
  name: "FastlyRefreshCert",
  title: "Fastly-更新证书",
  desc: "自动更新 Fastly CDN 上的已有自定义证书",
  icon: "simple-icons:fastly",
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class FastlyRefreshCertPlugin extends AbstractTaskPlugin {
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

  @TaskInput({
    title: "Access授权",
    helper: "Fastly 授权凭证",
    component: {
      name: "access-selector",
      type: "fastly",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书列表",
      helper: "选择要更新的 Fastly 证书 (必须是已存在的自定义证书)",
      action: FastlyRefreshCertPlugin.prototype.onGetCertList.name,
      pager: false,
      search: false,
      required: true,
    })
  )
  certList!: string[];

  async onInstance() {}

  async execute(): Promise<void> {
    const access = (await this.getAccess(this.accessId)) as FastlyAccess;
    const certPem = this.cert.crt;

    if (!this.certList || this.certList.length === 0) {
      throw new Error("请至少选择一个要更新的证书");
    }

    for (const certId of this.certList) {
      this.logger.info(`----------- 开始更新 Fastly 证书：${certId} -----------`);

      const payload: any = {
        data: {
          type: "tls_certificate",
          id: certId,
          attributes: {
            cert_blob: certPem,
          },
        },
      };

      await access.doRequestApi(`/tls/certificates/${certId}`, payload, "patch");
      this.logger.info(`----------- 更新 Fastly 证书 ${certId} 成功 -----------`);
    }

    this.logger.info("Fastly 证书批量更新完成");
  }

  async onGetCertList() {
    const access = (await this.getAccess(this.accessId)) as FastlyAccess;
    const list = await access.getCertificates();

    if (!list || list.length === 0) {
      throw new Error("没有找到 Fastly 证书");
    }

    const options = list.map((item: any) => {
      const name = item.attributes?.name || "Unnamed";
      const issuedTo = item.attributes?.issued_to || "Unknown Domain";
      return {
        label: `${name} - ${issuedTo} (${item.id})`,
        value: item.id,
      };
    });

    return { list: options };
  }
}

new FastlyRefreshCertPlugin();
