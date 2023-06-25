import { AbstractTaskPlugin, Autowire, HttpClient, IAccessService, IContext, IsTaskPlugin, RunStrategy, Step, TaskInput, TaskOutput } from "@certd/pipeline";
import dayjs from "dayjs";
import { AcmeService, CertInfo } from "./acme";
import _ from "lodash";
import { Logger } from "log4js";
import { Decorator } from "@certd/pipeline";
import { DnsProviderDefine, dnsProviderRegistry } from "../../dns-provider";
import { CertReader } from "./cert-reader";

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
      "支持通配符域名，例如： *.foo.com 、 *.test.handsfree.work\n" +
      "支持多个域名、多个子域名、多个通配符域名打到一个证书上（域名必须是在同一个DNS提供商解析）\n" +
      "多级子域名要分成多个域名输入（*.foo.com的证书不能用于xxx.yyy.foo.com）\n" +
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
    title: "更新天数",
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    required: true,
    helper: "到期前多少天后更新证书",
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
  })
  csrInfo: any;

  // @ts-ignore
  acme: AcmeService;

  @Autowire()
  logger!: Logger;

  @Autowire()
  userContext!: IContext;

  @Autowire()
  accessService!: IAccessService;

  @Autowire()
  http!: HttpClient;

  @Autowire()
  lastStatus!: Step;

  @TaskOutput({
    title: "域名证书",
  })
  cert?: CertInfo;

  async onInstance() {
    this.acme = new AcmeService({ userContext: this.userContext, logger: this.logger });
  }

  async execute(): Promise<void> {
    const oldCert = await this.condition();
    if (oldCert != null) {
      return this.output(oldCert);
    }
    const cert = await this.doCertApply();
    if (cert != null) {
      this.output(cert.toCertInfo());
      //清空后续任务的状态，让后续任务能够重新执行
      this.clearLastStatus();
    } else {
      throw new Error("申请证书失败");
    }
  }

  output(cert: CertInfo) {
    this.cert = cert;
  }

  /**
   * 是否更新证书
   * @param input
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
      this.csrInfo
    );
    this.logger.info("开始申请证书,", email, domains);

    const dnsProviderPlugin = dnsProviderRegistry.get(dnsProviderType);
    const DnsProviderClass = dnsProviderPlugin.target;
    const dnsProviderDefine = dnsProviderPlugin.define as DnsProviderDefine;
    const access = await this.accessService.getById(dnsProviderAccessId);

    // @ts-ignore
    const dnsProvider: IDnsProvider = new DnsProviderClass();
    const context = { access, logger: this.logger, http: this.http };
    Decorator.inject(dnsProviderDefine.autowire, dnsProvider, context);
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
