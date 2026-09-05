import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
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
    title: "Access授权",
    helper: "Fastly 授权凭证",
    component: {
      name: "access-selector",
      type: "fastly",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "证书ID",
    helper: "要部署的 Fastly 证书ID。如果是前置任务上传的，可以在前置任务的高级设置中获取输出变量",
    component: {
      placeholder: "例如: tls_cert_xxx 或填入变量",
    },
    required: true,
  })
  certificateId!: string;

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

    if (!this.certificateId || !this.domainId || !this.configurationId) {
      throw new Error("请提供完整的证书ID、TLS域名ID和TLS配置ID");
    }

    this.logger.info(`开始部署 Fastly TLS 激活 (域名ID: ${this.domainId})...`);

    const payload: any = {
      data: {
        type: "tls_activation",
        relationships: {
          tls_certificate: {
            data: {
              type: "tls_certificate",
              id: this.certificateId,
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
