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
    helper: "选择前置任务输出的域名证书(将自动上传到 Fastly)，" + "或选择前置【Fastly-上传证书到Fastly】任务输出的 Fastly 证书ID。",
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
      helper:
        "选择要绑定证书的域名，可多选(将为每个域名创建或更新一个 TLS 激活)。" +
        "列表为你 Fastly 服务上配置的域名，请选择被证书覆盖的具体主机名(如 www.example.com)，" +
        "而非通配 *.example.com(除非确有服务使用通配域名)。列表没有的也可直接输入。",
      action: FastlyDeployCertPlugin.prototype.onGetTlsDomainList.name,
      pager: false,
      search: false,
      required: true,
    })
  )
  domainIds!: string[];

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "TLS 配置",
      helper: "选择关联的 TLS 配置",
      action: FastlyDeployCertPlugin.prototype.onGetTlsConfigurationList.name,
      pager: false,
      search: false,
      single: true,
      required: true,
    })
  )
  configurationId!: string;

  async onInstance() {}

  async execute(): Promise<void> {
    const access = (await this.getAccess(this.accessId)) as FastlyAccess;

    // remote-select hands back an array; tolerate a single value too (older config / single:true).
    const rawDomains: any = this.domainIds ?? (this as any).domainId;
    const domainIds: string[] = Array.isArray(rawDomains) ? rawDomains.filter(Boolean) : rawDomains ? [rawDomains] : [];
    const rawConfig: any = this.configurationId;
    const configurationId: string = Array.isArray(rawConfig) ? rawConfig[0] : rawConfig;

    if (domainIds.length === 0 || !configurationId) {
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

    for (const domainId of domainIds) {
      this.logger.info(`开始部署 Fastly TLS 激活 (域名: ${domainId})...`);
      const { id, action } = await access.deployActivation(certificateId, configurationId, domainId);
      this.logger.info(`Fastly TLS 激活${action === "updated" ? "更新" : "创建"}成功 (域名: ${domainId}), 激活ID: ${id}`);
    }
  }

  async onGetTlsDomainList() {
    const access = (await this.getAccess(this.accessId)) as FastlyAccess;

    const [serviceDomains, tlsDomains] = await Promise.all([access.getServiceDomains().catch(() => [] as string[]), access.getTlsDomains().catch(() => [] as any[])]);

    const options: { label: string; value: string }[] = [];
    const seen = new Set<string>();

    // Domains actually served by your Fastly services — these can be activated.
    for (const name of serviceDomains) {
      if (name && !seen.has(name)) {
        seen.add(name);
        options.push({ label: name, value: name });
      }
    }

    // TLS domains from certificates/subscriptions (incl. wildcards) as extra choices.
    for (const item of tlsDomains || []) {
      const name = item?.id;
      if (name && !seen.has(name)) {
        seen.add(name);
        options.push({ label: `${name} (来自证书)`, value: name });
      }
    }

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
