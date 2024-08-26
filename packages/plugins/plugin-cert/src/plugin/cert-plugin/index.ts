import { Decorator, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import type { CertInfo, PrivateKeyType, SSLProvider } from "./acme.js";
import { AcmeService } from "./acme.js";
import _ from "lodash-es";
import { DnsProviderContext, DnsProviderDefine, dnsProviderRegistry } from "../../dns-provider/index.js";
import { CertReader } from "./cert-reader.js";
import { CertApplyBasePlugin } from "./base.js";

export { CertReader };
export type { CertInfo };

@IsTaskPlugin({
  name: "CertApply",
  title: "证书申请（JS版）",
  group: pluginGroups.cert.key,
  desc: "免费通配符域名证书申请，支持多个域名打到同一个证书上",
  default: {
    input: {
      renewDays: 20,
      forceUpdate: false,
    },
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
})
export class CertApplyPlugin extends CertApplyBasePlugin {
  @TaskInput({
    title: "证书提供商",
    value: "letsencrypt",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "letsencrypt", label: "Let's Encrypt" },
        { value: "google", label: "Google" },
        { value: "zerossl", label: "ZeroSSL" },
      ],
    },
    helper: "如果letsencrypt.org或dv.acme-v02.api.pki.goog无法访问，请尝试开启代理选项\n如果使用ZeroSSL、google证书，需要提供EAB授权",
    required: true,
  })
  sslProvider!: SSLProvider;

  @TaskInput({
    title: "加密算法",
    value: "rsa_2048",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "rsa_1024", label: "RSA 1024" },
        { value: "rsa_2048", label: "RSA 2048" },
        { value: "rsa_3072", label: "RSA 3072" },
        { value: "rsa_4096", label: "RSA 4096" },
        { value: "ec_256", label: "EC 256" },
        { value: "ec_384", label: "EC 384" },
        // { value: "ec_521", label: "EC 521" },
      ],
    },
    required: true,
  })
  privateKeyType!: PrivateKeyType;

  @TaskInput({
    title: "EAB授权",
    component: {
      name: "pi-access-selector",
      type: "eab",
    },
    maybeNeed: true,
    helper:
      "如果使用ZeroSSL或者google证书，需要提供EAB授权\nZeroSSL：请前往 https://app.zerossl.com/developer 生成 'EAB Credentials' \n Google：请前往https://github.com/certd/certd/blob/v2/doc/google/google.md",
  })
  eabAccessId!: number;

  @TaskInput({
    title: "DNS提供商",
    component: {
      name: "pi-dns-provider-selector",
    },
    required: true,
    helper: "请选择dns解析提供商",
  })
  dnsProviderType!: string;

  @TaskInput({
    title: "DNS解析授权",
    component: {
      name: "pi-access-selector",
    },
    required: true,
    helper: "请选择dns解析提供商授权",
    reference: [
      {
        src: "form.dnsProviderType",
        dest: "component.type",
        type: "computed",
      },
    ],
  })
  dnsProviderAccess!: string;

  @TaskInput({
    title: "使用代理",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    maybeNeed: true,
    helper: "如果acme-v02.api.letsencrypt.org或dv.acme-v02.api.pki.goog被墙无法访问，请尝试开启此选项",
  })
  useProxy = false;

  @TaskInput({
    title: "跳过本地校验DNS",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "如果重试多次出现Authorization not found TXT record，导致无法申请成功，请尝试开启此选项",
  })
  skipLocalVerify = false;

  acme!: AcmeService;

  async onInit() {
    let eab: any = null;
    if (this.eabAccessId) {
      eab = await this.ctx.accessService.getById(this.eabAccessId);
    }
    this.acme = new AcmeService({
      userContext: this.userContext,
      logger: this.logger,
      sslProvider: this.sslProvider,
      eab,
      skipLocalVerify: this.skipLocalVerify,
      useMappingProxy: this.useProxy,
      privateKeyType: this.privateKeyType,
    });
  }

  async doCertApply() {
    const email = this["email"];
    const domains = this["domains"];
    const dnsProviderType = this["dnsProviderType"];
    const dnsProviderAccessId = this["dnsProviderAccess"];
    const csrInfo = _.merge(
      {
        country: "CN",
        state: "GuangDong",
        locality: "ShengZhen",
        organization: "CertD Org.",
        organizationUnit: "IT Department",
        emailAddress: email,
      },
      this.csrInfo ? JSON.parse(this.csrInfo) : {}
    );
    this.logger.info("开始申请证书,", email, domains);

    const dnsProviderPlugin = dnsProviderRegistry.get(dnsProviderType);
    const DnsProviderClass = dnsProviderPlugin.target;
    const dnsProviderDefine = dnsProviderPlugin.define as DnsProviderDefine;
    const access = await this.accessService.getById(dnsProviderAccessId);

    // @ts-ignore
    const dnsProvider: IDnsProvider = new DnsProviderClass();
    const context: DnsProviderContext = { access, logger: this.logger, http: this.http };
    Decorator.inject(dnsProviderDefine.autowire, dnsProvider, context);
    dnsProvider.setCtx(context);
    await dnsProvider.onInstance();

    try {
      const cert = await this.acme.order({
        email,
        domains,
        dnsProvider,
        csrInfo,
        isTest: false,
        privateKeyType: this.privateKeyType,
      });

      const certInfo = this.formatCerts(cert);
      return new CertReader(certInfo);
    } catch (e: any) {
      const message: string = e.message;
      if (message.indexOf("redundant with a wildcard domain in the same request") >= 0) {
        this.logger.error(e);
        throw new Error(`通配符域名已经包含了普通域名，请删除其中一个（${message}）`);
      }
      throw e;
    }
  }
}

new CertApplyPlugin();
