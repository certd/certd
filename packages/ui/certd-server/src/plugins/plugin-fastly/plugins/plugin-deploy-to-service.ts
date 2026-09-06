import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { FastlyAccess } from "../access.js";

@IsTaskPlugin({
  name: "FastlyDeployCert",
  title: "Fastly-部署TLS激活",
  desc: "部署 Fastly 证书 (创建 TLS Activation 绑定证书到域名)",
  icon: "simple-icons:fastly",
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class FastlyDeployCertPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper:
      "选择前置任务输出的域名证书(将自动上传到 Fastly)，" +
      "或选择前置【Fastly-上传证书到Fastly】任务输出的 Fastly 证书ID。",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "FastlyUploadCert"],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput({
    title: "证书名称",
    helper: "可选。当传入的是域名证书需要先上传时，作为 Fastly 上的自定义证书名称/标签",
    component: {
      placeholder: "例如: my-fastly-cert",
    },
    required: false,
  })
  name = "";

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
      title: "TLS 域名",
      helper: "选择要绑定证书的 Fastly TLS 域名",
      action: FastlyDeployCertPlugin.prototype.onGetTlsDomainList.name,
      pager: false,
      search: false,
      required: true,
    })
  )
  domainId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "TLS 配置",
      helper: "选择关联的 TLS 配置",
      action: FastlyDeployCertPlugin.prototype.onGetTlsConfigurationList.name,
      pager: false,
      search: false,
      required: true,
    })
  )
  configurationId!: string;

  async onInstance() {}

  async execute(): Promise<void> {
    const access = (await this.getAccess(this.accessId)) as FastlyAccess;

    if (!this.domainId || !this.configurationId) {
      throw new Error("请提供完整的 TLS 域名和 TLS 配置");
    }

    // `cert` is a string when it comes from a FastlyUploadCert step (already a Fastly
    // tls_certificate id); otherwise it is a raw CertInfo that must be uploaded first.
    let certificateId: string;
    if (typeof this.cert === "string") {
      certificateId = this.cert;
    } else {
      const certName = this.name && this.name.trim() ? this.name.trim() : undefined;
      this.logger.info("未检测到 Fastly 证书ID，先上传证书到 Fastly...");
      certificateId = await access.createCertificate(this.cert.crt, this.cert.key, certName);
      this.logger.info(`证书上传成功, Fastly 证书ID: ${certificateId}`);
    }

    if (!certificateId) {
      throw new Error("未能获取 Fastly 证书ID");
    }

    this.logger.info(`开始部署 Fastly TLS 激活 (域名ID: ${this.domainId})...`);

    const payload: any = {
      data: {
        type: "tls_activation",
        relationships: {
          tls_certificate: {
            data: {
              type: "tls_certificate",
              id: certificateId,
            },
          },
          tls_configuration: {
            data: {
              type: "tls_configuration",
              id: this.configurationId,
            },
          },
          tls_domain: {
            data: {
              type: "tls_domain",
              id: this.domainId,
            },
          },
        },
      },
    };

    const res = await access.doRequestApi("/tls/activations", payload, "post");
    this.logger.info(`Fastly TLS 激活部署成功, 激活ID: ${res?.data?.id}`);
  }

  async onGetTlsDomainList() {
    const access = (await this.getAccess(this.accessId)) as FastlyAccess;
    const list = await access.getTlsDomains();

    if (!list || list.length === 0) {
      return { list: [] };
    }

    const options = list.map((item: any) => {
      // Fastly API typically returns id as the domain name for tls_domains
      return {
        label: item.id,
        value: item.id,
      };
    });

    return { list: options };
  }

  async onGetTlsConfigurationList() {
    const access = (await this.getAccess(this.accessId)) as FastlyAccess;
    const list = await access.getTlsConfigurations();

    if (!list || list.length === 0) {
      return { list: [] };
    }

    const options = list.map((item: any) => {
      return {
        label: `${item.attributes?.name || "Unnamed Configuration"} (${item.id})`,
        value: item.id,
      };
    });

    return { list: options };
  }
}

new FastlyDeployCertPlugin();
