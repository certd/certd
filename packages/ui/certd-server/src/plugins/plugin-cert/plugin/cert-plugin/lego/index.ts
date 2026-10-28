import { IsTaskPlugin, pluginGroups, RunStrategy, Step, TaskInput } from "@certd/pipeline";
import type { CertReader } from "@certd/plugin-lib";
import { CertApplyBasePlugin } from "../base.js";
import { PrivateKeyType } from "./dns.js";
import { EabAccess } from "../../../access/index.js";

@IsTaskPlugin({
  name: "CertApplyLego",
  icon: "ph:certificate",
  title: "证书申请（Lego）",
  group: pluginGroups.cert.key,
  deprecated: "暂时禁用此插件，请使用JS版证书插件生成证书",
  desc: "支持海量DNS解析提供商，推荐使用，一样的免费通配符域名证书申请，支持多个域名打到同一个证书上",
  i18n: {
    "en-US": {
      title: "Request Certificate (Lego)",
      desc: "Recommended. Supports a wide range of DNS providers and requests free wildcard certificates with multiple domains in one certificate.",
      input: {
        domains: {
          title: "Certificate Domains",
          component: { placeholder: "Enter certificate domains or IPs, e.g. foo.com, *.foo.com, *.sub.foo.com, *.bar.com, 123.123.123.123" },
          helper:
            "1. Multiple domains can be included in one certificate.\n2. Do not include subdomains already covered by a wildcard.\n3. A wildcard covers only one level.\n4. Enter a domain, press Space, then enter the next one.\n5. Configure delegated subdomain hosting before use if applicable.",
        },
        renewDays: { title: "Renewal Window (Days)" },
        forceUpdate: { title: "Force Renewal" },
        dnsType: { title: "DNS Provider Type", helper: "Select the provider that hosts your domain's DNS. See the [Lego DNS documentation](https://go-acme.github.io/lego/dns/) for the provider name and configuration." },
        environment: { title: "Environment Variables", helper: "Enter one variable per line, for example appKeyId=xxxxx. See the [Lego DNS documentation](https://go-acme.github.io/lego/dns/) for required variables." },
        legoEabAccessId: { title: "EAB Credentials", helper: "Select EAB credentials if required by your certificate authority." },
        customArgs: { title: "Custom Lego Global Options", helper: "Additional Lego global command-line options. See the [Lego CLI documentation](https://go-acme.github.io/lego/usage/cli/options/)." },
        customCommandOptions: { title: "Custom Lego Run Options", helper: "Additional options for the Lego run command. See the [Lego CLI documentation](https://go-acme.github.io/lego/usage/cli/options/)." },
        privateKeyType: { title: "Key Algorithm", helper: "Keep the default unless needed." },
        pfxPassword: { title: "Certificate Encryption Password", helper: "Choose whether to encrypt PFX and JKS certificates. If omitted, PFX uses an empty password and JKS uses 123456." },
        pfxArgs: {
          title: "PFX Conversion Options",
          component: {
            optionsMapping: {
              "": "Latest Windows Server compatibility",
              "-macalg SHA1 -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES": "Windows Server 2016 compatibility",
              "-nomac -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES": "Windows Server 2008 compatibility",
            },
          },
          helper: "Options for compatibility with different Windows Server versions.",
        },
      },
      output: { cert: { title: "Domain Certificate" }, certMd5: { title: "Certificate MD5" } },
    },
  },
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
export class CertApplyLegoPlugin extends CertApplyBasePlugin {
  // @TaskInput({
  //   title: "ACME服务端点",
  //   default: "https://acme-v02.api.letsencrypt.org/directory",
  //   component: {
  //     name: "a-select",
  //     vModel: "value",
  //     options: [
  //       { value: "https://acme-v02.api.letsencrypt.org/directory", label: "Let's Encrypt" },
  //       { value: "https://letsencrypt.proxy.handfree.work/directory", label: "Let's Encrypt代理，letsencrypt.org无法访问时使用" },
  //     ],
  //   },
  //   required: true,
  // })
  acmeServer!: string;

  @TaskInput({
    title: "DNS类型",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "alidns",
    },
    helper: "你的域名是通过哪家提供商进行解析的，具体应该配置什么请参考lego文档：https://go-acme.github.io/lego/dns/",
    required: true,
  })
  dnsType!: string;

  @TaskInput({
    title: "环境变量",
    component: {
      name: "a-textarea",
      vModel: "value",
      rows: 4,
      placeholder: "ALICLOUD_ACCESS_KEY=abcdefghijklmnopqrstuvwx\nALICLOUD_SECRET_KEY=your-secret-key",
    },
    required: true,
    helper: "一行一条，例如 appKeyId=xxxxx，具体配置请参考lego文档：https://go-acme.github.io/lego/dns/",
  })
  environment!: string;

  @TaskInput({
    title: "EAB授权",
    component: {
      name: "access-selector",
      type: "eab",
    },
    helper: "如果需要提供EAB授权",
  })
  legoEabAccessId!: number;

  @TaskInput({
    title: "自定义LEGO全局参数",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "--dns-timeout 30",
    },
    helper: "额外的lego全局命令行参数，参考文档：https://go-acme.github.io/lego/usage/cli/options/",
    maybeNeed: true,
  })
  customArgs = "";

  @TaskInput({
    title: "自定义LEGO签名参数",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "--no-bundle",
    },
    helper: "额外的lego签名命令行参数，参考文档：https://go-acme.github.io/lego/usage/cli/options/",
    maybeNeed: true,
  })
  customCommandOptions = "";

  @TaskInput({
    title: "加密算法",
    value: "ec256",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "rsa2048", label: "RSA 2048" },
        { value: "rsa3072", label: "RSA 3072" },
        { value: "rsa4096", label: "RSA 4096" },
        { value: "rsa8192", label: "RSA 8192" },
        { value: "ec256", label: "EC 256" },
        { value: "ec384", label: "EC 384" },
        // { value: "ec_521", label: "EC 521" },
      ],
    },
    helper: "如无特殊需求，默认即可",
    required: true,
  })
  privateKeyType!: PrivateKeyType;

  eab?: EabAccess;

  getCheckChangeInputKeys() {
    return ["domains", "privateKeyType", "dnsType"];
  }

  async onInstance() {
    this.accessService = this.ctx.accessService;
    this.logger = this.ctx.logger;
    this.userContext = this.ctx.userContext;
    this.lastStatus = this.ctx.lastStatus as Step;
    if (this.legoEabAccessId) {
      this.eab = await this.accessService.getById(this.legoEabAccessId);
    }
  }
  async onInit(): Promise<void> {}

  async doCertApply(): Promise<CertReader> {
    throw new Error("当前调用Lego存在命令注入风险，暂时禁用Lego插件，请使用JS版证书插件生成证书");
  }
}

new CertApplyLegoPlugin();
