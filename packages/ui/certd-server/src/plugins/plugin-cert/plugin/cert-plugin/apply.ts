import { CancelError, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { utils } from "@certd/basic";

import { AcmeAccountInfo, AcmeService, DomainsVerifyPlan, DomainVerifyPlan, PrivateKeyType, SSLProvider } from "./acme.js";
import { createDnsProvider, DnsProviderContext, DnsVerifier, DomainVerifiers, HttpVerifier, IDnsProvider, IDomainVerifierGetter, ISubDomainsGetter } from "@certd/plugin-lib";
import { CertReader } from "@certd/plugin-lib";
import { CertApplyBasePlugin } from "./base.js";
import { GoogleClient } from "../../libs/google.js";
import { EabAccess } from "../../access/index.js";
import { DomainParser } from "@certd/plugin-lib";
import { ossClientFactory } from "../../../plugin-lib/oss/factory.js";
import { merge } from "lodash-es";

export type CnameRecordInput = {
  id: number;
  status: string;
};

export type HttpRecordInput = {
  domain: string;
  httpUploaderType: string;
  httpUploaderAccess: number;
  httpUploadRootDir: string;
};
export type DnsPersistRecordInput = {
  domain: string;
  status?: string;
  hostRecord?: string;
  recordValue?: string;
  accountUri?: string;
};
export type DomainVerifyPlanInput = {
  domain: string;
  type: "cname" | "dns" | "http" | "dns-persist";
  dnsProviderType?: string;
  dnsProviderAccessType?: string;
  dnsProviderAccessId?: number;
  cnameVerifyPlan?: Record<string, CnameRecordInput>;
  httpVerifyPlan?: Record<string, HttpRecordInput>;
  dnsPersistVerifyPlan?: Record<string, DnsPersistRecordInput>;
};
export type DomainsVerifyPlanInput = {
  [key: string]: DomainVerifyPlanInput;
};

const preferredChainConfigs = {
  letsencrypt: {
    helper: "如无特殊需求保持默认即可",
    options: [
      { value: "ISRG Root X1", label: "ISRG Root X1" },
      { value: "ISRG Root X2", label: "ISRG Root X2" },
    ],
  },
  google: {
    helper: "GlobalSign 提供对老旧设备更好的兼容性，但证书链会变长",
    options: [
      { value: "GTS Root R1", label: "GTS Root R1" },
      { value: "GlobalSign", label: "GlobalSign" },
    ],
  },
} as const;

const preferredChainSupportedProviders = Object.keys(preferredChainConfigs);

const preferredChainMergeScript = (() => {
  const configs = JSON.stringify(preferredChainConfigs);
  const supportedProviders = JSON.stringify(preferredChainSupportedProviders);
  const defaultProvider = JSON.stringify(preferredChainSupportedProviders[0]);
  return `
    const chainConfigs = ${configs};
    const supportedProviders = ${supportedProviders};
    const defaultProvider = ${defaultProvider};
    const getConfig = (provider)=> chainConfigs[provider] || chainConfigs[defaultProvider];
    return {
        show: ctx.compute(({form})=> supportedProviders.includes(form.sslProvider)),
        component: {
            options: ctx.compute(({form})=> getConfig(form.sslProvider).options)
        },
        helper: ctx.compute(({form})=> getConfig(form.sslProvider).helper),
        value: ctx.compute(({form})=>{
            const { options } = getConfig(form.sslProvider);
            const allowed = options.map(item=>item.value);
            const current = form.preferredChain;
            if(allowed.includes(current)){
                return current;
            }
            return allowed[0];
        })
    };
  `;
})();

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
  constructor() {
    super();
    this.version = 1;
  }

  @TaskInput({
    title: "版本",
    value: 2,
    isSys: true,
    show: false,
  })
  version?: number;

  @TaskInput({
    title: "域名验证方式",
    value: "dns",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "dns", label: "DNS直接验证" },
        { value: "dns-persist", label: "DNS持久验证" },
        { value: "cname", label: "CNAME代理验证" },
        { value: "http", label: "HTTP文件验证（IP证书只能选它）" },
        { value: "dnses", label: "多DNS提供商" },
        { value: "auto", label: "自动匹配" },
      ],
    },
    required: true,
    helper: `1. <b>DNS直接验证</b>：当域名dns解析已被本系统支持时（即下方DNS解析服务商选项中可选），推荐选择此方式
2.  <b>CNAME代理验证</b>：支持任何注册商的域名，第一次需要手动添加[CNAME记录](#/certd/cname/record)（如果经常申请失败，建议将DNS服务器修改为阿里云/腾讯云的，然后使用DNS直接验证）
3.  <b>HTTP文件验证</b>：不支持泛域名，需要配置网站文件上传（IP证书必须选它）
4.  <b>多DNS提供商</b>：每个域名可以选择独立的DNS提供商
5.  <b>自动匹配</b>：此处无需选择校验方式，需要在[域名管理](#/certd/cert/domain)中提前配置好校验方式
6.  <b>DNS持久验证</b>：需要先配置ACME账号和_validation-persist持久TXT记录，续期时不再增删DNS记录；当前仅 Let's Encrypt 测试环境可以申请
`,
  })
  challengeType!: string;

  @TaskInput({
    title: "DNS解析服务商",
    component: {
      name: "dns-provider-selector",
    },
    mergeScript: `
    return {
      show: ctx.compute(({form})=>{
          return form.challengeType === 'dns'
      }),
      component:{
        onSelectedChange: ctx.compute(({form})=>{
          return ($event)=>{
           form.dnsProviderAccessType = $event.accessType
          }
        }),
        onChange: ctx.compute(({form})=>{
          return ($event)=>{
            form.dnsProviderAccess = null
          }
        }),
      },
    }
    `,
    required: true,
    helper: "您的域名注册商，或者域名的dns服务器属于哪个平台\n如果这里没有，请选择CNAME代理验证",
  })
  dnsProviderType!: string;

  // dns解析授权类型,勿删
  dnsProviderAccessType!: string;

  @TaskInput({
    title: "DNS解析授权",
    component: {
      name: "access-selector",
    },
    required: true,
    helper: "请选择dns解析服务商授权",
    mergeScript: `return {
      component:{
        type: ctx.compute(({form})=>{
            return form.dnsProviderAccessType || form.dnsProviderType
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
    rules: [{ type: "checkDomainVerifyPlan" }],
    required: true,
    col: {
      span: 24,
    },
    mergeScript: `return {
      component:{
        domains: ctx.compute(({form})=>{
            return form.domains
        }),
        defaultType: ctx.compute(({form})=>{
            return form.challengeType || 'cname'
        }),
        caType: ctx.compute(({form})=>{
            return form.sslProvider
        }),
        acmeAccountAccessId: ctx.compute(({form})=>{
            return form.acmeAccountAccessId
        }),
        commonAcmeAccountAccessId: ctx.compute(({form})=>{
            const key = form.sslProvider + 'CommonAcmeAccountAccessId';
            return form[key]
        })
      },
      show: ctx.compute(({form})=>{
          return form.challengeType === 'cname' ||  form.challengeType === 'http' ||  form.challengeType === 'dnses' || form.challengeType === 'dns-persist'
      }),
      helper: ctx.compute(({form})=>{
          if(form.challengeType === 'cname' ){
              return '请按照上面的提示，给要申请证书的域名添加CNAME记录，添加后，点击验证，验证成功后不要删除记录，申请和续期证书会一直用它'
          }else if (form.challengeType === 'http'){
              return '请按照上面的提示，给每个域名设置文件上传配置，证书申请过程中会上传校验文件到网站根目录文件夹下，请确保该校验文件可以公网http访问到'
          }else if (form.challengeType === 'dnses'){
              return '给每个域名单独配置dns提供商'
          }else if (form.challengeType === 'dns-persist'){
              return '请先创建并校验_validation-persist TXT持久记录，校验成功后才能提交流水线；当前仅 Let\\'s Encrypt 测试环境可以申请'
          }
      })
    }
    `,
  })
  domainsVerifyPlan!: DomainsVerifyPlanInput;

  @TaskInput({
    title: "证书颁发机构",
    value: "letsencrypt",
    component: {
      name: "icon-select",
      vModel: "value",
      options: [
        { value: "letsencrypt", label: "Let's Encrypt（免费，新手推荐，支持IP证书）", icon: "simple-icons:letsencrypt" },
        { value: "google", label: "Google（免费）", icon: "flat-color-icons:google" },
        { value: "zerossl", label: "ZeroSSL（免费）", icon: "emojione:digit-zero" },
        { value: "litessl", label: "litessl（免费）", icon: "roentgen:free" },
        { value: "sslcom", label: "SSL.com（仅主域名和www免费）", icon: "la:expeditedssl" },
        { value: "letsencrypt_staging", label: "Let's Encrypt测试环境（仅供测试）", icon: "simple-icons:letsencrypt" },
      ],
    },
    mergeScript: `return {
      component:{
        onSelectedChange: ctx.compute(({form})=>{
          return ($event)=>{
            form.acmeAccountAccessId = null
          }
        })
      }
    }
    `,
    helper: "Let's Encrypt：申请最简单\nGoogle：大厂光环，兼容性好，仅首次需要翻墙获取EAB授权，无需翻墙\nSSL.com：仅主域名和www免费,必须设置CAA记录",
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
    title: "Google公共ACME账号",
    isSys: true,
    show: false,
  })
  googleCommonAcmeAccountAccessId!: number;

  @TaskInput({
    title: "ZeroSSL公共EAB授权",
    isSys: true,
    show: false,
  })
  zerosslCommonEabAccessId!: number;

  @TaskInput({
    title: "ZeroSSL公共ACME账号",
    isSys: true,
    show: false,
  })
  zerosslCommonAcmeAccountAccessId!: number;

  @TaskInput({
    title: "SSL.com公共EAB授权",
    isSys: true,
    show: false,
  })
  sslcomCommonEabAccessId!: number;

  @TaskInput({
    title: "SSL.com公共ACME账号",
    isSys: true,
    show: false,
  })
  sslcomCommonAcmeAccountAccessId!: number;

  @TaskInput({
    title: "litessl公共EAB授权",
    isSys: true,
    show: false,
  })
  litesslCommonEabAccessId!: number;

  @TaskInput({
    title: "litessl公共ACME账号",
    isSys: true,
    show: false,
  })
  litesslCommonAcmeAccountAccessId!: number;

  @TaskInput({
    title: "EAB授权",
    component: {
      name: "access-selector",
      type: "eab",
    },
    maybeNeed: false,
    required: false,
    helper:
      "需要提供EAB授权" +
      "\nZeroSSL：请前往[zerossl开发者中心](https://app.zerossl.com/developer),生成 'EAB Credentials'" +
      "\nGoogle:请查看[google获取eab帮助文档](https://certd.docmirror.cn/guide/use/google/)，用过一次后会绑定邮箱，后续复用EAB要用同一个邮箱" +
      "\nSSL.com:[SSL.com账号页面](https://secure.ssl.com/account),然后点击api credentials链接，然后点击编辑按钮，查看Secret key和HMAC key" +
      "\nlitessl:[litesslEAB页面](https://freessl.cn/automation/eab-manager),然后点击新增EAB",
    mergeScript: `
    return {
        show: ctx.compute(({form})=>{
          if (form.version === 2) {
            return false
          }
          if(form.acmeAccountAccessId){
            return false
          }
          const commonAcmeKey = form.sslProvider + 'CommonAcmeAccountAccessId';
          if (form[commonAcmeKey]) {
            return false
          }
            return (form.sslProvider === 'zerossl' && !form.zerosslCommonEabAccessId)
            || (form.sslProvider === 'google' && !form.googleCommonEabAccessId)
            || (form.sslProvider === 'sslcom' && !form.sslcomCommonEabAccessId)
            || (form.sslProvider === 'litessl' && !form.litesslCommonEabAccessId)
        })
    }
    `,
  })
  eabAccessId!: number;

  @TaskInput({
    title: "ACME账号",
    component: {
      name: "access-selector",
      type: "acmeAccount",
    },
    required: false,
    helper: "请选择颁发机构对应的ACME账号",
    mergeScript: `
    return {
        show: ctx.compute(({form})=>{
            const commonKey = form.sslProvider + 'CommonAcmeAccountAccessId';
            if (form[commonKey]) {
              return false
            }
            return !!form.sslProvider
        }),
        component:{
          subtype: ctx.compute(({form})=> form.sslProvider)
        },
        required: ctx.compute(({form})=>{
            const commonKey = form.sslProvider + 'CommonAcmeAccountAccessId';
            if (form[commonKey]) {
              return false
            }
            return form.version === 2
        })
    }
    `,
  })
  acmeAccountAccessId!: number;

  @TaskInput({
    title: "服务账号授权",
    component: {
      name: "access-selector",
      type: "google",
    },
    maybeNeed: false,
    required: false,
    helper: "google服务账号授权与EAB授权选填其中一个，[服务账号授权获取方法](https://certd.docmirror.cn/guide/use/google/)\n服务账号授权需要配置代理或者服务器本身在海外",
    mergeScript: `
    return {
        show: ctx.compute(({form})=>{
            if (form.version === 2) {
              return false
            }
            if(form.acmeAccountAccessId){
              return false
            }
            if(form.googleCommonAcmeAccountAccessId){
              return false
            }
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
    helper: "如无特殊需求，默认即可\n选择RSA 2048 pkcs1可以获得旧版RSA证书",
    maybeNeed: false,
    required: true,
  })
  privateKeyType!: PrivateKeyType;

  @TaskInput({
    title: "证书配置",
    value: "classic",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "classic", label: "经典（classic）" },
        { value: "tlsserver", label: "TLS服务器（tlsserver）" },
        { value: "shortlived", label: "短暂的（shortlived）" },
      ],
    },
    helper: "如无特殊需求，默认即可",
    required: false,
    maybeNeed: true,
    mergeScript: `
    return {
        show: ctx.compute(({form})=>{
            return form.sslProvider === 'letsencrypt'
        })
    }
    `,
  })
  certProfile!: string;

  @TaskInput({
    title: "首选链",
    component: {
      name: "a-select",
      vModel: "value",
      options: preferredChainConfigs.letsencrypt.options,
    },
    helper: preferredChainConfigs.letsencrypt.helper,
    required: false,
    maybeNeed: true,
    mergeScript: preferredChainMergeScript,
  })
  preferredChain!: string;

  @TaskInput({
    title: "使用代理",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    maybeNeed: true,
    helper: "如果acme-v02.api.letsencrypt.org或dv.acme-v02.api.pki.goog被墙无法访问，请尝试开启此选项\n默认情况会进行测试，如果无法访问，将会自动使用代理",
  })
  useProxy = false;

  @TaskInput({
    title: "自定义反代地址",
    component: {
      placeholder: "google.yourproxy.com",
    },
    maybeNeed: true,
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
    maybeNeed: true,
    helper: "跳过本地校验可以加快申请速度，同时也会增加失败概率。",
  })
  skipLocalVerify = false;

  @TaskInput({
    title: "检查解析重试次数",
    value: 20,
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    maybeNeed: true,
    helper: "检查域名验证解析记录重试次数，如果你的域名服务商解析生效速度慢，可以适当增加此值",
  })
  maxCheckRetryCount = 20;

  @TaskInput({
    title: "等待解析生效时长",
    value: 30,
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    maybeNeed: true,
    helper: "等待解析生效时长（秒），如果使用CNAME方式校验，本地验证失败，可以尝试延长此时间（比如5-10分钟）",
  })
  waitDnsDiffuseTime = 30;

  acme!: AcmeService;

  eab!: EabAccess;

  async onInit() {
    let eab: EabAccess = null;

    const isNewVersion = this.version === 2;
    if (!isNewVersion && this.sslProvider && !this.sslProvider.startsWith("letsencrypt")) {
      if (this.sslProvider === "google" && this.googleAccessId) {
        this.logger.info("当前正在使用 google服务账号授权获取EAB");
        const googleAccess = await this.getAccess(this.googleAccessId);
        const googleClient = new GoogleClient({
          access: googleAccess,
          logger: this.logger,
        });
        eab = await googleClient.getEab();
      } else {
        const getEab = async (type: string) => {
          if (this.eabAccessId) {
            this.logger.info(`当前正在使用 ${type} EAB授权`);
            eab = await this.getAccess(this.eabAccessId);
          } else if (this[`${type}CommonEabAccessId`]) {
            this.logger.info(`当前正在使用 ${type} 公共EAB授权`);
            eab = await this.getAccess(this[`${type}CommonEabAccessId`], true);
          } else {
            throw new Error(`${type}需要配置EAB授权`);
          }
        };
        await getEab(this.sslProvider);
      }
    }
    this.eab = eab;
    const subDomainsGetter = await this.ctx.serviceGetter.get<ISubDomainsGetter>("subDomainsGetter");
    const domainParser = new DomainParser(subDomainsGetter, this.logger);

    this.acme = new AcmeService({
      userId: this.ctx.user.id,
      userContext: this.userContext,
      logger: this.logger,
      sslProvider: this.sslProvider,
      eab,
      skipLocalVerify: this.skipLocalVerify,
      useMappingProxy: this.useProxy,
      reverseProxy: this.reverseProxy,
      privateKeyType: this.privateKeyType,
      signal: this.ctx.signal,
      maxCheckRetryCount: this.maxCheckRetryCount,
      domainParser,
      waitDnsDiffuseTime: this.waitDnsDiffuseTime,
    });
  }

  async doCertApply() {
    let email = this.email;
    if (this.eab && this.eab.email) {
      email = this.eab.email;
    }
    const domains = this["domains"];

    const csrInfo = merge(
      {
        // country: "CN",
        // state: "GuangDong",
        // locality: "ShengZhen",
        // organization: "CertD Org.",
        // organizationUnit: "IT Department",
        // emailAddress: email,
      },
      this.csrInfo ? JSON.parse(this.csrInfo) : {}
    );
    this.logger.info("开始申请证书,", email, domains);

    let dnsProvider: IDnsProvider = null;
    let domainsVerifyPlan: DomainsVerifyPlan = null;
    let acmeAccount: AcmeAccountInfo = null;
    if (this.acmeAccountAccessId) {
      const access: any = await this.getAccess(this.acmeAccountAccessId);
      acmeAccount = this.parseAcmeAccount(access.account);
    } else {
      acmeAccount = await this.getCommonAcmeAccount();
    }
    if (this.version === 2 && !acmeAccount) {
      throw new Error("请选择颁发机构对应的ACME账号");
    }
    if (this.challengeType === "dns-persist") {
      if (!acmeAccount) {
        throw new Error("DNS持久验证需要先选择ACME账号");
      }
      domainsVerifyPlan = await this.createDnsPersistDomainsVerifyPlan(domains, acmeAccount);
    } else if (this.challengeType === "cname" || this.challengeType === "http" || this.challengeType === "dnses") {
      domainsVerifyPlan = await this.createDomainsVerifyPlan(domains, this.domainsVerifyPlan, acmeAccount);
    } else if (this.challengeType === "auto") {
      domainsVerifyPlan = await this.createDomainsVerifyPlanByAuto(domains);
    } else {
      const dnsProviderType = this.dnsProviderType;
      const access = await this.getAccess(this.dnsProviderAccess);
      dnsProvider = await this.createDnsProvider(dnsProviderType, access);
    }

    try {
      const cert = await this.acme.order({
        email,
        domains,
        dnsProvider,
        domainsVerifyPlan,
        csrInfo,
        privateKeyType: this.privateKeyType,
        profile: this.certProfile,
        preferredChain: this.preferredChain,
        acmeAccount,
      });

      const certInfo = this.formatCerts(cert);
      return new CertReader(certInfo);
    } catch (e: any) {
      const message: string = e?.message;
      if (message != null && message.indexOf("redundant with a wildcard domain in the same request") >= 0) {
        this.logger.error(e);
        throw new Error(`通配符域名已经包含了普通域名，请删除其中一个（${message}）`);
      }
      if (e.name === "CancelError") {
        throw new CancelError(e.message);
      }
      throw e;
    }
  }

  async createDnsProvider(dnsProviderType: string, dnsProviderAccess: any): Promise<IDnsProvider> {
    const domainParser = this.acme.options.domainParser;
    const context: DnsProviderContext = {
      access: dnsProviderAccess,
      logger: this.logger,
      http: this.ctx.http,
      utils,
      domainParser,
      serviceGetter: this.ctx.serviceGetter,
    };
    return await createDnsProvider({
      dnsProviderType,
      context,
    });
  }

  parseAcmeAccount(account: string | AcmeAccountInfo): AcmeAccountInfo {
    if (!account) {
      throw new Error("ACME账号授权缺少账号信息，请重新生成ACME账号");
    }
    const parsed = typeof account === "string" ? JSON.parse(account) : account;
    if (!parsed.accountKey || !parsed.accountUri) {
      throw new Error("ACME账号无效，请重新生成ACME账号");
    }
    return parsed;
  }

  async getCommonAcmeAccount(): Promise<AcmeAccountInfo | null> {
    if (!this.sslProvider || this.sslProvider === "letsencrypt" || this.sslProvider === "letsencrypt_staging") {
      return null;
    }
    const commonAccessId = this[`${this.sslProvider}CommonAcmeAccountAccessId`];
    if (!commonAccessId) {
      return null;
    }
    const accessService: any = this.ctx.accessService;
    if (!accessService?.getCommonById) {
      return null;
    }
    const access = await accessService.getCommonById(commonAccessId);
    if (!access?.account) {
      return null;
    }
    this.logger.info(`使用系统公共${this.sslProvider} ACME账号`);
    return this.parseAcmeAccount(access.account);
  }

  private async createDnsPersistDomainsVerifyPlan(domains: string[], acmeAccount: AcmeAccountInfo): Promise<DomainsVerifyPlan> {
    const plan: DomainsVerifyPlan = {};
    const domainParser = this.acme.options.domainParser;
    for (const fullDomain of domains) {
      const domain = fullDomain.replaceAll("*.", "");
      const mainDomain = await domainParser.parse(domain);
      const persistRecord = this.domainsVerifyPlan?.[mainDomain]?.dnsPersistVerifyPlan?.[domain];
      plan[domain] = this.createDnsPersistDomainVerifyPlan(domain, mainDomain, acmeAccount, persistRecord);
    }
    return plan;
  }

  private createDnsPersistDomainVerifyPlan(domain: string, mainDomain: string, acmeAccount: AcmeAccountInfo, persistRecord?: DnsPersistRecordInput): DomainVerifyPlan {
    if (!persistRecord) {
      throw new Error(`DNS持久验证记录${domain}不存在，请先创建并校验`);
    }
    if (persistRecord.status !== "valid") {
      throw new Error(`DNS持久验证记录${domain}还未校验成功`);
    }
    return {
      type: "dns-persist",
      mainDomain,
      domain,
      dnsPersistVerifyPlan: {
        hostRecord: persistRecord.hostRecord || `_validation-persist.${domain}`,
        recordValue: persistRecord.recordValue || this.buildDnsPersistRecordValue(acmeAccount.accountUri, true),
        accountUri: persistRecord.accountUri || acmeAccount.accountUri,
      },
    };
  }

  buildDnsPersistRecordValue(accountUri: string, wildcard = false, persistUntil?: number) {
    const parts = [`letsencrypt.org`, `accounturi=${accountUri}`];
    if (wildcard !== false) {
      parts.push("policy=wildcard");
    }
    if (persistUntil) {
      parts.push(`persistUntil=${persistUntil}`);
    }
    return parts.join("; ");
  }

  async createDomainsVerifyPlan(domains: string[], verifyPlanSetting: DomainsVerifyPlanInput, acmeAccount?: AcmeAccountInfo): Promise<DomainsVerifyPlan> {
    const plan: DomainsVerifyPlan = {};

    const domainParser = this.acme.options.domainParser;
    for (const fullDomain of domains) {
      const domain = fullDomain.replaceAll("*.", "");
      const mainDomain = await domainParser.parse(domain);
      const planSetting: DomainVerifyPlanInput = verifyPlanSetting[mainDomain];
      if (planSetting == null) {
        throw new Error(`没有找到域名（${domain}）的校验计划（如果您在流水线创建之后设置了子域名托管，需要重新编辑证书申请任务和重新校验cname记录的校验状态）`);
      }
      if (planSetting.type === "dns") {
        plan[domain] = await this.createDnsDomainVerifyPlan(planSetting, domain, mainDomain);
      } else if (planSetting.type === "cname") {
        plan[domain] = await this.createCnameDomainVerifyPlan(domain, mainDomain);
      } else if (planSetting.type === "http") {
        plan[domain] = await this.createHttpDomainVerifyPlan(planSetting.httpVerifyPlan[domain], domain, mainDomain);
      } else if (planSetting.type === "dns-persist") {
        if (!acmeAccount) {
          throw new Error("DNS持久验证需要先选择ACME账号");
        }
        plan[domain] = this.createDnsPersistDomainVerifyPlan(domain, mainDomain, acmeAccount, planSetting.dnsPersistVerifyPlan?.[domain]);
      }
    }
    return plan;
  }

  private async createDomainsVerifyPlanByAuto(domains: string[]) {
    //从数据库里面自动选择校验方式
    // domain list
    const domainList = new Set<string>();
    //整理域名
    for (let domain of domains) {
      domain = domain.replaceAll("*.", "");
      domainList.add(domain);
    }
    const domainVerifierGetter: IDomainVerifierGetter = await this.ctx.serviceGetter.get("domainVerifierGetter");

    const verifiers: DomainVerifiers = await domainVerifierGetter.getVerifiers([...domainList]);

    const plan: DomainsVerifyPlan = {};

    for (const domain in verifiers) {
      const verifier = verifiers[domain];
      if (verifier == null) {
        throw new Error(`没有找到与该域名（${domain}）匹配的校验方式，请先到‘域名管理’页面添加校验方式`);
      }
      if (verifier.type === "dns") {
        plan[domain] = await this.createDnsDomainVerifyPlan(verifier.dns, domain, verifier.mainDomain);
      } else if (verifier.type === "cname") {
        plan[domain] = await this.createCnameDomainVerifyPlan(domain, verifier.mainDomain);
      } else if (verifier.type === "http") {
        plan[domain] = await this.createHttpDomainVerifyPlan(verifier.http, domain, verifier.mainDomain);
      }
    }
    return plan;
  }

  private async createDnsDomainVerifyPlan(planSetting: DnsVerifier, domain: string, mainDomain: string): Promise<DomainVerifyPlan> {
    const access = await this.getAccess(planSetting.dnsProviderAccessId);
    return {
      type: "dns",
      mainDomain,
      domain,
      dnsProvider: await this.createDnsProvider(planSetting.dnsProviderType, access),
    };
  }

  private async createHttpDomainVerifyPlan(httpSetting: HttpVerifier, domain: string, mainDomain: string): Promise<DomainVerifyPlan> {
    const httpUploaderContext = {
      accessService: this.ctx.accessService,
      logger: this.logger,
      utils,
    };

    const access = await this.getAccess(httpSetting.httpUploaderAccess);
    let rootDir = httpSetting.httpUploadRootDir;
    if (!rootDir.endsWith("/") && !rootDir.endsWith("\\")) {
      rootDir = rootDir + "/";
    }
    this.logger.info("上传方式", httpSetting.httpUploaderType);
    const httpUploader = await ossClientFactory.createOssClientByType(httpSetting.httpUploaderType, {
      access,
      rootDir: rootDir,
      ctx: httpUploaderContext,
    });
    return {
      type: "http",
      domain,
      mainDomain,
      httpVerifyPlan: {
        type: "http",
        domain,
        httpUploader,
      },
    };
  }

  private async createCnameDomainVerifyPlan(domain: string, mainDomain: string): Promise<DomainVerifyPlan> {
    const cnameRecord = await this.ctx.cnameProxyService.getByDomain(domain);
    if (cnameRecord == null) {
      throw new Error(`请先配置${domain}的CNAME记录，并通过校验`);
    }
    if (cnameRecord.status !== "valid") {
      throw new Error(`CNAME记录${domain}的校验状态为${cnameRecord.status}，请等待校验通过`);
    }

    // 主域名异常
    if (cnameRecord.mainDomain && mainDomain && cnameRecord.mainDomain !== mainDomain) {
      throw new Error(`CNAME记录${domain}的域名与配置的主域名不一致（${cnameRecord.mainDomain}≠${mainDomain}），请确认是否在流水线创建之后修改了子域名托管，您需要重新校验CNAME记录的校验状态`);
    }

    let dnsProvider = cnameRecord.commonDnsProvider;
    if (cnameRecord.cnameProvider.id > 0) {
      dnsProvider = await this.createDnsProvider(cnameRecord.cnameProvider.dnsProviderType, cnameRecord.cnameProvider.access);
    }

    return {
      type: "cname",
      domain,
      mainDomain,
      cnameVerifyPlan: {
        domain: cnameRecord.cnameProvider.domain,
        fullRecord: cnameRecord.recordValue,
        dnsProvider,
      },
    };
  }

  async onGetReverseProxyList() {
    const sysSettingsService: any = await this.ctx.serviceGetter.get("sysSettingsService");
    const sysSettings = await sysSettingsService.getPrivateSettings();
    return sysSettings.reverseProxyList || [];
  }
}

new CertApplyPlugin();
