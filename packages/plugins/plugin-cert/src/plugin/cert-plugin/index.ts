import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, utils } from "@certd/pipeline";
import type { CertInfo, CnameVerifyPlan, DomainsVerifyPlan, PrivateKeyType, SSLProvider } from "./acme.js";
import { AcmeService } from "./acme.js";
import _ from "lodash-es";
import { createDnsProvider, DnsProviderContext, IDnsProvider } from "../../dns-provider/index.js";
import { CertReader } from "./cert-reader.js";
import { CertApplyBasePlugin } from "./base.js";
import { GoogleClient } from "../../libs/google.js";
import { EabAccess } from "../../access";

export type { CertInfo };
export * from "./cert-reader.js";
export type CnameRecordInput = {
  id: number;
  status: string;
};
export type DomainVerifyPlanInput = {
  domain: string;
  type: "cname" | "dns";
  dnsProviderType?: string;
  dnsProviderAccessId?: number;
  cnameVerifyPlan?: Record<string, CnameRecordInput>;
};
export type DomainsVerifyPlanInput = {
  [key: string]: DomainVerifyPlanInput;
};

@IsTaskPlugin({
  name: "CertApply",
  title: "证书申请（JS版）",
  icon: "ph:certificate",
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
    title: "域名验证方式",
    value: "dns",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "dns", label: "DNS直接验证" },
        { value: "cname", label: "CNAME代理验证" },
      ],
    },
    required: true,
    helper:
      "DNS直接验证：适合域名是在阿里云、腾讯云、华为云、Cloudflare、西数注册的，需要提供Access授权信息。\nCNAME代理验证：支持任何注册商注册的域名，并且不需要提供Access授权信息，但第一次需要手动添加CNAME记录",
  })
  challengeType!: string;

  @TaskInput({
    title: "DNS提供商",
    component: {
      name: "dns-provider-selector",
    },
    mergeScript: `
    return {
      show: ctx.compute(({form})=>{
          return form.challengeType === 'dns' 
      })
    }
    `,
    required: true,
    helper: "请选择dns解析提供商，您的域名是在哪里注册的，或者域名的dns解析服务器属于哪个平台\n如果这里没有您需要的dns解析提供商，请选择CNAME代理验证校验方式",
  })
  dnsProviderType!: string;

  @TaskInput({
    title: "DNS解析授权",
    component: {
      name: "access-selector",
    },
    required: true,
    helper: "请选择dns解析提供商授权",
    mergeScript: `return {
      component:{
        type: ctx.compute(({form})=>{
            return form.dnsProviderType
        })
      },
      show: ctx.compute(({form})=>{
          return form.challengeType === 'dns' 
      })
    }
    `,
  })
  dnsProviderAccess!: number;

  @TaskInput({
    title: "域名验证配置",
    component: {
      name: "domains-verify-plan-editor",
    },
    rules: [{ type: "checkCnameVerifyPlan" }],
    required: true,
    helper: "如果选择CNAME方式，请按照上面的显示，给要申请证书的域名添加CNAME记录，添加后，点击验证，验证成功后不要删除记录，申请和续期证书会一直用它",
    col: {
      span: 24,
    },
    mergeScript: `return {
      component:{
        domains: ctx.compute(({form})=>{
            return form.domains
        })
      },
      show: ctx.compute(({form})=>{
          return form.challengeType === 'cname' 
      })
    }
    `,
  })
  domainsVerifyPlan!: DomainsVerifyPlanInput;

  @TaskInput({
    title: "证书颁发机构",
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
    helper: "Let's Encrypt最简单，如果使用ZeroSSL、Google证书，需要提供EAB授权",
    required: true,
  })
  sslProvider!: SSLProvider;

  @TaskInput({
    title: "Google公共EAB授权",
    isSys: true,
    show: false,
  })
  googleCommonEabAccessId!: number;

  @TaskInput({
    title: "ZeroSSL公共EAB授权",
    isSys: true,
    show: false,
  })
  zerosslCommonEabAccessId!: number;

  @TaskInput({
    title: "EAB授权",
    component: {
      name: "access-selector",
      type: "eab",
    },
    maybeNeed: true,
    required: false,
    helper:
      "需要提供EAB授权\nZeroSSL：请前往[zerossl开发者中心](https://app.zerossl.com/developer),生成 'EAB Credentials'\n Google:请查看[google获取eab帮助文档](https://gitee.com/certd/certd/blob/v2/doc/google/google.md)，用过一次后会绑定邮箱，后续复用EAB要用同一个邮箱",
    mergeScript: `
    return {
        show: ctx.compute(({form})=>{
            return (form.sslProvider === 'zerossl' && !form.zerosslCommonEabAccessId) || (form.sslProvider === 'google' && !form.googleCommonEabAccessId)
        })
    }
    `,
  })
  eabAccessId!: number;

  @TaskInput({
    title: "服务账号授权",
    component: {
      name: "access-selector",
      type: "google",
    },
    maybeNeed: true,
    required: false,
    helper:
      "google服务账号授权与EAB授权选填其中一个，[服务账号授权获取方法](https://gitee.com/certd/certd/blob/v2/doc/google/google.md)\n服务账号授权需要配置代理或者服务器本身在海外",
    mergeScript: `
    return {
        show: ctx.compute(({form})=>{
            return form.sslProvider === 'google' && !form.googleCommonEabAccessId
        })
    }
    `,
  })
  googleAccessId!: number;

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
        { value: "rsa_2048_pkcs1", label: "RSA 2048 pkcs1 (旧版)" },
        { value: "ec_256", label: "EC 256" },
        { value: "ec_384", label: "EC 384" },
        // { value: "ec_521", label: "EC 521" },
      ],
    },
    helper: "如无特殊需求，默认即可",
    required: true,
  })
  privateKeyType!: PrivateKeyType;

  @TaskInput({
    title: "使用代理",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "如果acme-v02.api.letsencrypt.org或dv.acme-v02.api.pki.goog被墙无法访问，请尝试开启此选项\n默认情况会进行测试，如果无法访问，将会自动使用代理",
  })
  useProxy = false;

  @TaskInput({
    title: "自定义反代地址",
    component: {
      placeholder: "google.yourproxy.com",
    },
    helper: "填写你的自定义反代地址，不要带http://\nletsencrypt反代目标：acme-v02.api.letsencrypt.org\ngoogle反代目标：dv.acme-v02.api.pki.goog",
  })
  reverseProxy = "";

  @TaskInput({
    title: "跳过本地校验DNS",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "跳过本地校验可以加快申请速度，同时也会增加失败概率。",
  })
  skipLocalVerify = false;

  acme!: AcmeService;

  eab!: EabAccess;
  async onInit() {
    let eab: EabAccess = null;

    if (this.sslProvider === "google") {
      if (this.googleAccessId) {
        this.logger.info("当前正在使用 google服务账号授权获取EAB");
        const googleAccess = await this.ctx.accessService.getById(this.googleAccessId);
        const googleClient = new GoogleClient({
          access: googleAccess,
          logger: this.logger,
        });
        eab = await googleClient.getEab();
      } else if (this.eabAccessId) {
        this.logger.info("当前正在使用 google EAB授权");
        eab = await this.ctx.accessService.getById(this.eabAccessId);
      } else if (this.googleCommonEabAccessId) {
        this.logger.info("当前正在使用 google公共EAB授权");
        eab = await this.ctx.accessService.getCommonById(this.googleCommonEabAccessId);
      } else {
        this.logger.error("google需要配置EAB授权或服务账号授权");
        return;
      }
    } else if (this.sslProvider === "zerossl") {
      if (this.eabAccessId) {
        this.logger.info("当前正在使用 zerossl EAB授权");
        eab = await this.ctx.accessService.getById(this.eabAccessId);
      } else if (this.zerosslCommonEabAccessId) {
        this.logger.info("当前正在使用 zerossl 公共EAB授权");
        eab = await this.ctx.accessService.getCommonById(this.zerosslCommonEabAccessId);
      } else {
        this.logger.error("zerossl需要配置EAB授权");
        return;
      }
    }
    this.eab = eab;
    this.acme = new AcmeService({
      userContext: this.userContext,
      logger: this.logger,
      sslProvider: this.sslProvider,
      eab,
      skipLocalVerify: this.skipLocalVerify,
      useMappingProxy: this.useProxy,
      reverseProxy: this.reverseProxy,
      privateKeyType: this.privateKeyType,
      // cnameProxyService: this.ctx.cnameProxyService,
      // dnsProviderCreator: this.createDnsProvider.bind(this),
    });
  }

  async doCertApply() {
    let email = this.email;
    if (this.eab && this.eab.email) {
      email = this.eab.email;
    }
    const domains = this["domains"];

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

    let dnsProvider: any = null;
    let domainsVerifyPlan: DomainsVerifyPlan = null;
    if (this.challengeType === "cname") {
      domainsVerifyPlan = await this.createDomainsVerifyPlan();
    } else {
      const dnsProviderType = this.dnsProviderType;
      const access = await this.ctx.accessService.getById(this.dnsProviderAccess);
      dnsProvider = await this.createDnsProvider(dnsProviderType, access);
    }

    try {
      const cert = await this.acme.order({
        email,
        domains,
        dnsProvider,
        domainsVerifyPlan,
        csrInfo,
        isTest: false,
        privateKeyType: this.privateKeyType,
      });

      const certInfo = this.formatCerts(cert);
      return new CertReader(certInfo);
    } catch (e: any) {
      const message: string = e?.message;
      if (message != null && message.indexOf("redundant with a wildcard domain in the same request") >= 0) {
        this.logger.error(e);
        throw new Error(`通配符域名已经包含了普通域名，请删除其中一个（${message}）`);
      }
      throw e;
    }
  }

  async createDnsProvider(dnsProviderType: string, dnsProviderAccess: any): Promise<IDnsProvider> {
    const context: DnsProviderContext = { access: dnsProviderAccess, logger: this.logger, http: this.ctx.http, utils };
    return await createDnsProvider({
      dnsProviderType,
      context,
    });
  }

  async createDomainsVerifyPlan(): Promise<DomainsVerifyPlan> {
    const plan: DomainsVerifyPlan = {};
    for (const domain in this.domainsVerifyPlan) {
      const domainVerifyPlan = this.domainsVerifyPlan[domain];
      let dnsProvider = null;
      const cnameVerifyPlan: Record<string, CnameVerifyPlan> = {};
      if (domainVerifyPlan.type === "dns") {
        const access = await this.ctx.accessService.getById(domainVerifyPlan.dnsProviderAccessId);
        dnsProvider = await this.createDnsProvider(domainVerifyPlan.dnsProviderType, access);
      } else {
        for (const key in domainVerifyPlan.cnameVerifyPlan) {
          const cnameRecord = await this.ctx.cnameProxyService.getByDomain(key);
          cnameVerifyPlan[key] = {
            domain: cnameRecord.cnameProvider.domain,
            fullRecord: cnameRecord.recordValue,
            dnsProvider: await this.createDnsProvider(cnameRecord.cnameProvider.dnsProviderType, cnameRecord.cnameProvider.access),
          };
        }
      }
      plan[domain] = {
        domain,
        type: domainVerifyPlan.type,
        dnsProvider,
        cnameVerifyPlan,
      };
    }
    return plan;
  }
}

new CertApplyPlugin();
