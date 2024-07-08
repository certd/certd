import { AbstractTaskPlugin, Decorator, HttpClient, IAccessService, IContext, IsTaskPlugin, RunStrategy, Step, TaskInput, TaskOutput } from "@certd/pipeline";
import dayjs from "dayjs";
import { AcmeService, CertInfo, SSLProvider } from "./acme";
import _ from "lodash";
import { Logger } from "log4js";
import { DnsProviderContext, DnsProviderDefine, dnsProviderRegistry } from "../../dns-provider";
import { CertReader } from "./cert-reader";
import JSZip from "jszip";

export { CertReader };
export type { CertInfo };

@IsTaskPlugin({
  name: "CertApply",
  title: "证书申请",
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
export class CertApplyPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名",
    component: {
      name: "a-select",
      vModel: "value",
      mode: "tags",
      open: false,
    },
    required: true,
    col: {
      span: 24,
    },
    helper:
      "支持通配符域名，例如： *.foo.com、foo.com、*.test.handsfree.work\n" +
      "支持多个域名、多个子域名、多个通配符域名打到一个证书上（域名必须是在同一个DNS提供商解析）\n" +
      "多级子域名要分成多个域名输入（*.foo.com的证书不能用于xxx.yyy.foo.com、foo.com）\n" +
      "输入一个回车之后，再输入下一个",
  })
  domains!: string;

  @TaskInput({
    title: "邮箱",
    component: {
      name: "a-input",
      vModel: "value",
    },
    required: true,
    helper: "请输入邮箱",
  })
  email!: string;

  @TaskInput({
    title: "证书提供商",
    default: "letsencrypt",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "letsencrypt", label: "Let's Encrypt" },
        // { value: "buypass", label: "Buypass" },
        { value: "zerossl", label: "ZeroSSL" },
      ],
    },
    required: true,
  })
  sslProvider!: SSLProvider;

  @TaskInput({
    title: "EAB授权",
    component: {
      name: "pi-access-selector",
      type: "eab",
    },
    helper: "如果使用ZeroSSL证书，需要提供EAB授权， 请前往 https://app.zerossl.com/developer 生成 'EAB Credentials for ACME Clients' ",
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
    title: "跳过本地校验DNS解析",
    default: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "如果重试多次出现Authorization not found TXT record，导致无法申请成功，请尝试开启此选项",
  })
  skipLocalVerify = false;

  @TaskInput({
    title: "更新天数",
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    required: true,
    helper: "到期前多少天后更新证书，注意：流水线默认不会自动运行，请设置定时器，每天定时运行本流水线",
  })
  renewDays!: number;

  @TaskInput({
    title: "强制更新",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "是否强制重新申请证书",
  })
  forceUpdate!: string;

  @TaskInput({
    title: "CsrInfo",
    helper: "暂时没有用",
  })
  csrInfo!: string;

  @TaskInput({
    title: "配置说明",
    helper: "运行策略请选择总是运行，其他证书部署任务请选择成功后跳过；当证书快到期前将会自动重新申请证书，然后会清空后续任务的成功状态，部署任务将会重新运行",
  })
  intro!: string;

  acme!: AcmeService;
  logger!: Logger;
  userContext!: IContext;
  accessService!: IAccessService;
  http!: HttpClient;
  lastStatus!: Step;

  @TaskOutput({
    title: "域名证书",
  })
  cert?: CertInfo;

  async onInstance() {
    this.accessService = this.ctx.accessService;
    this.logger = this.ctx.logger;
    this.userContext = this.ctx.userContext;
    this.http = this.ctx.http;
    this.lastStatus = this.ctx.lastStatus as Step;

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
    });
  }

  async execute(): Promise<void> {
    const oldCert = await this.condition();
    if (oldCert != null) {
      return await this.output(oldCert);
    }
    const cert = await this.doCertApply();
    if (cert != null) {
      await this.output(cert);
      //清空后续任务的状态，让后续任务能够重新执行
      this.clearLastStatus();
    } else {
      throw new Error("申请证书失败");
    }
  }

  async output(certReader: CertReader) {
    const cert: CertInfo = certReader.toCertInfo();
    this.cert = cert;
    // this.logger.info(JSON.stringify(certReader.detail));
    const applyTime = dayjs(certReader.detail.validity.notBefore).format("YYYYMMDD_HHmmss");
    await this.zipCert(cert, applyTime);
  }

  async zipCert(cert: CertInfo, applyTime: string) {
    const zip = new JSZip();
    zip.file("cert.crt", cert.crt);
    zip.file("cert.key", cert.key);
    const domain_name = this.domains[0].replace(".", "_").replace("*", "_");
    const filename = `cert_${domain_name}_${applyTime}.zip`;
    const content = await zip.generateAsync({ type: "nodebuffer" });
    this.saveFile(filename, content);
    this.logger.info(`已保存文件:${filename}`);
  }

  /**
   * 是否更新证书
   */
  async condition() {
    if (this.forceUpdate) {
      return null;
    }

    let inputChanged = false;
    const oldInput = JSON.stringify(this.lastStatus?.input?.domains);
    const thisInput = JSON.stringify(this.domains);
    if (oldInput !== thisInput) {
      inputChanged = true;
    }

    let oldCert: CertReader | undefined = undefined;
    try {
      oldCert = await this.readLastCert();
    } catch (e) {
      this.logger.warn("读取cert失败：", e);
    }
    if (oldCert == null) {
      this.logger.info("还未申请过，准备申请新证书");
      return null;
    }

    if (inputChanged) {
      this.logger.info("输入参数变更，申请新证书");
      return null;
    }

    const ret = this.isWillExpire(oldCert.expires, this.renewDays);
    if (!ret.isWillExpire) {
      this.logger.info(`证书还未过期：过期时间${dayjs(oldCert.expires).format("YYYY-MM-DD HH:mm:ss")},剩余${ret.leftDays}天`);
      return oldCert;
    }
    this.logger.info("即将过期，开始更新证书");
    return null;
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

    const cert = await this.acme.order({
      email,
      domains,
      dnsProvider,
      csrInfo,
      isTest: false,
    });

    const certInfo = this.formatCerts(cert);
    return new CertReader(certInfo);
  }

  formatCert(pem: string) {
    pem = pem.replace(/\r/g, "");
    pem = pem.replace(/\n\n/g, "\n");
    pem = pem.replace(/\n$/g, "");
    return pem;
  }

  formatCerts(cert: { crt: string; key: string; csr: string }) {
    const newCert: CertInfo = {
      crt: this.formatCert(cert.crt),
      key: this.formatCert(cert.key),
      csr: this.formatCert(cert.csr),
    };
    return newCert;
  }

  async readLastCert(): Promise<CertReader | undefined> {
    const cert = this.lastStatus?.status?.output?.cert;
    if (cert == null) {
      return undefined;
    }
    return new CertReader(cert);
  }

  /**
   * 检查是否过期，默认提前20天
   * @param expires
   * @param maxDays
   * @returns {boolean}
   */
  isWillExpire(expires: number, maxDays = 20) {
    if (expires == null) {
      throw new Error("过期时间不能为空");
    }
    // 检查有效期
    const leftDays = dayjs(expires).diff(dayjs(), "day");
    return {
      isWillExpire: leftDays < maxDays,
      leftDays,
    };
  }
}

new CertApplyPlugin();
