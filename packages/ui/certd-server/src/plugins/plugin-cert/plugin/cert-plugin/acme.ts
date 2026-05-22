import * as acme from "@certd/acme-client";
import type { Challenge, ClientExternalAccountBindingOptions, UrlMapping } from "@certd/acme-client";
import { ILogger, utils } from "@certd/basic";
import { IContext } from "@certd/pipeline";
import { IDnsProvider, IDomainParser } from "@certd/plugin-lib";
import punycode from "punycode.js";
import { IOssClient } from "../../../plugin-lib/index.js";
export type CnameVerifyPlan = {
  type?: string;
  domain: string;
  fullRecord: string;
  dnsProvider: IDnsProvider;
};

export type HttpVerifyPlan = {
  type: string;
  domain: string;
  httpUploader: IOssClient;
};

export type DomainVerifyPlan = {
  domain: string;
  mainDomain: string;
  type: "cname" | "dns" | "http";
  dnsProvider?: IDnsProvider;
  cnameVerifyPlan?: CnameVerifyPlan;
  httpVerifyPlan?: HttpVerifyPlan;
};
export type DomainsVerifyPlan = {
  [key: string]: DomainVerifyPlan;
};

export type Providers = {
  dnsProvider?: IDnsProvider;
  domainsVerifyPlan?: DomainsVerifyPlan;
};

export type CertInfo = {
  crt: string; //fullchain证书
  key: string; //私钥
  csr?: string; //csr
  oc?: string; //仅证书，非fullchain证书
  ic?: string; //中间证书
  pfx?: string;
  der?: string;
  jks?: string;
  one?: string;
  p7b?: string;
};
export type SSLProvider = "letsencrypt" | "google" | "zerossl" | "sslcom" | "letsencrypt_staging";
export type PrivateKeyType = "rsa_1024" | "rsa_2048" | "rsa_3072" | "rsa_4096" | "ec_256" | "ec_384" | "ec_521";
type AcmeEabOptions = ClientExternalAccountBindingOptions & {
  id?: number;
  accountKey?: string;
};
type AcmeServiceOptions = {
  userContext: IContext;
  logger: ILogger;
  sslProvider: SSLProvider;
  eab?: AcmeEabOptions;
  skipLocalVerify?: boolean;
  useMappingProxy?: boolean;
  reverseProxy?: string;
  privateKeyType?: PrivateKeyType;
  signal?: AbortSignal;
  maxCheckRetryCount?: number;
  userId: number;
  domainParser: IDomainParser;
  waitDnsDiffuseTime?: number;
};

export class AcmeService {
  options: AcmeServiceOptions;
  userContext: IContext;
  logger: ILogger;
  sslProvider: SSLProvider;
  skipLocalVerify = true;
  eab?: AcmeEabOptions;
  constructor(options: AcmeServiceOptions) {
    this.options = options;
    this.userContext = options.userContext;
    this.logger = options.logger;
    this.sslProvider = options.sslProvider || "letsencrypt";
    this.eab = options.eab;
    this.skipLocalVerify = options.skipLocalVerify ?? false;
    // acme.setLogger((message: any, ...args: any[]) => {
    //   this.logger.info(message, ...args);
    // });
  }

  async getAccountConfig(email: string, urlMapping: UrlMapping): Promise<any> {
    let conf = (await this.userContext.getObj(this.buildAccountKey(email))) || {};
    const eabAccountKey = this.getEabAccountPrivateKey();
    if (eabAccountKey) {
      conf = {
        ...((await this.userContext.getObj(this.buildAccessAccountKey())) || {}),
        key: eabAccountKey,
      };
    }
    if (urlMapping && urlMapping.mappings) {
      for (const key in urlMapping.mappings) {
        if (Object.prototype.hasOwnProperty.call(urlMapping.mappings, key)) {
          const element = urlMapping.mappings[key];
          if (conf.accountUrl?.indexOf(element) > -1) {
            //如果用了代理url，要替换回去
            conf.accountUrl = conf.accountUrl.replace(element, key);
          }
        }
      }
    }
    return conf;
  }

  buildAccountKey(email: string) {
    return `acme.config.${this.sslProvider}.${email}`;
  }

  buildAccessAccountKey() {
    return `acme.config.${this.sslProvider}.access.${this.eab.id}`;
  }

  getEabAccountPrivateKey() {
    if (!this.eab?.accountKey) {
      return null;
    }
    let accountKey;
    try {
      accountKey = JSON.parse(this.eab.accountKey);
    } catch {
      return this.eab.accountKey;
    }
    if (accountKey.kid !== this.eab.kid) {
      throw new Error("EAB的KID已变化，请点击刷新重新生成ACME账号私钥");
    }
    return accountKey.privateKey;
  }

  formatCreateAccountError(e: any) {
    const message = e?.message || "";
    if (message.includes("Unknown external account binding (EAB) key")) {
      return new Error(`EAB授权已失效或已过期，请重新获取EAB授权并刷新ACME账号私钥后重试。原始错误：${message}`);
    }
    return e;
  }

  async saveAccountConfig(email: string, conf: any) {
    if (this.getEabAccountPrivateKey()) {
      // userContext 跟用户走。公共 EAB 场景下这里仅作为当前用户缓存；
      // 其他用户会通过 onlyReturnExisting 用同一个账号私钥取回 accountUrl。
      await this.userContext.setObj(this.buildAccessAccountKey(), { accountUrl: conf.accountUrl });
      return;
    }
    await this.userContext.setObj(this.buildAccountKey(email), conf);
  }

  async getAcmeClient(email: string): Promise<acme.Client> {
    const directoryUrl = acme.getDirectoryUrl({ sslProvider: this.sslProvider, pkType: this.options.privateKeyType });
    let targetUrl = directoryUrl.replace("https://", "");
    targetUrl = targetUrl.substring(0, targetUrl.indexOf("/"));

    const mappings = {
      "acme-v02.api.letsencrypt.org": "le.px.certd.handfree.work",
      "dv.acme-v02.api.pki.goog": "gg.px.certd.handfree.work",
    };
    const reverseProxies = acme.getSslProviderReverseProxies();
    if (reverseProxies) {
      for (const key in reverseProxies) {
        const value = reverseProxies[key];
        if (value) {
          mappings[key] = value;
        }
      }
    }
    if (this.options.reverseProxy && targetUrl) {
      mappings[targetUrl] = this.options.reverseProxy;
    }
    const urlMapping: UrlMapping = {
      enabled: false,
      mappings,
    };
    const conf = await this.getAccountConfig(email, urlMapping);
    if (conf.key == null) {
      conf.key = await this.createNewKey();
      await this.saveAccountConfig(email, conf);
      this.logger.info(`创建新的Accountkey:${email}`);
    }

    if (this.options.useMappingProxy) {
      urlMapping.enabled = true;
    } else {
      //测试directory是否可以访问
      const isOk = await this.testDirectory(directoryUrl);
      if (!isOk) {
        this.logger.info("测试访问失败，自动使用代理");
        urlMapping.enabled = true;
      }
    }
    const client = new acme.Client({
      sslProvider: this.sslProvider,
      directoryUrl: directoryUrl,
      accountKey: conf.key,
      accountUrl: conf.accountUrl,
      externalAccountBinding: this.eab,
      backoffAttempts: this.options.maxCheckRetryCount || 20,
      backoffMin: 5000,
      backoffMax: 30 * 1000,
      urlMapping,
      signal: this.options.signal,
      logger: this.logger,
    });

    if (conf.accountUrl == null) {
      const accountPayload = {
        termsOfServiceAgreed: true,
        contact: [`mailto:${email}`],
        externalAccountBinding: this.eab,
      };
      if (this.getEabAccountPrivateKey()) {
        try {
          // RFC 8555 的 newAccount 支持 onlyReturnExisting。
          // 使用同一个账号私钥时，CA 会返回已存在账号的 URL，不会再次消费 EAB。
          await client.createAccount({ onlyReturnExisting: true });
          conf.accountUrl = client.getAccountUrl();
          await this.saveAccountConfig(email, conf);
          return client;
        } catch (e: any) {
          this.logger.info(`未找到已存在的ACME账号，准备创建新账号:${e.message}`);
        }
      }
      try {
        await client.createAccount(accountPayload);
      } catch (e: any) {
        throw this.formatCreateAccountError(e);
      }
      conf.accountUrl = client.getAccountUrl();
      await this.saveAccountConfig(email, conf);
    }
    return client;
  }

  async createNewKey() {
    const key = await acme.crypto.createPrivateKey(2048);
    return key.toString();
  }

  async challengeCreateFn(authz: any, keyAuthorizationGetter: (challenge: Challenge) => Promise<string>, providers: Providers) {
    this.logger.info("Triggered challengeCreateFn()");

    const fullDomain = authz.identifier.value;
    let domain = await this.options.domainParser.parse(fullDomain);
    this.logger.info("主域名为：" + domain);

    const getChallenge = (type: string) => {
      return authz.challenges.find((c: any) => c.type === type);
    };

    const doHttpVerify = async (challenge: any, httpUploader: IOssClient) => {
      const keyAuthorization = await keyAuthorizationGetter(challenge);
      this.logger.info("http校验");
      const filePath = `.well-known/acme-challenge/${challenge.token}`;
      const fileContents = keyAuthorization;
      this.logger.info(`校验 ${fullDomain} ，准备上传文件：${filePath}`);
      await httpUploader.upload(filePath, Buffer.from(fileContents));
      this.logger.info(`上传文件【${filePath}】成功`);
      return {
        challenge,
        keyAuthorization,
        httpUploader,
      };
    };

    const doDnsVerify = async (challenge: any, fullRecord: string, dnsProvider: IDnsProvider) => {
      this.logger.info("dns校验");
      const keyAuthorization = await keyAuthorizationGetter(challenge);

      const mainDomain = dnsProvider.usePunyCode() ? domain : punycode.toUnicode(domain);
      fullRecord = dnsProvider.usePunyCode() ? fullRecord : punycode.toUnicode(fullRecord);
      const recordValue = keyAuthorization;
      let hostRecord = fullRecord.replace(`${mainDomain}`, "");
      if (hostRecord.endsWith(".")) {
        hostRecord = hostRecord.substring(0, hostRecord.length - 1);
      }

      const recordReq = {
        domain: mainDomain,
        fullRecord,
        hostRecord,
        type: "TXT",
        value: recordValue,
      };
      this.logger.info("添加 TXT 解析记录", JSON.stringify(recordReq));
      const recordRes = await dnsProvider.createRecord(recordReq);
      this.logger.info("添加 TXT 解析记录成功", JSON.stringify(recordRes));
      return {
        recordReq,
        recordRes,
        dnsProvider,
        challenge,
        keyAuthorization,
      };
    };

    let dnsProvider = providers.dnsProvider;
    let fullRecord = `_acme-challenge.${fullDomain}`;

    // const origDomain = punycode.toUnicode(domain);
    const origFullDomain = punycode.toUnicode(fullDomain);

    const isIp = utils.domain.isIp(origFullDomain);
    function checkIpChallenge(type: string) {
      if (isIp) {
        throw new Error(`IP证书不支持${type}校验方式，请选择HTTP方式校验`);
      }
    }
    if (providers.domainsVerifyPlan) {
      //按照计划执行
      const domainVerifyPlan = providers.domainsVerifyPlan[origFullDomain] || providers.domainsVerifyPlan[fullDomain];
      if (domainVerifyPlan) {
        if (domainVerifyPlan.type === "dns") {
          checkIpChallenge("dns");
          dnsProvider = domainVerifyPlan.dnsProvider;
        } else if (domainVerifyPlan.type === "cname") {
          checkIpChallenge("cname");
          const cname: CnameVerifyPlan = domainVerifyPlan.cnameVerifyPlan;
          if (cname) {
            dnsProvider = cname.dnsProvider;
            fullRecord = cname.fullRecord;
            domain = await this.options.domainParser.parse(fullRecord);
          } else {
            this.logger.error(`未找到域名${fullDomain}的CNAME校验计划，请修改证书申请配置`);
          }
          if (dnsProvider == null) {
            throw new Error(`未找到域名${fullDomain}CNAME校验计划的DnsProvider，请修改证书申请配置`);
          }
        } else if (domainVerifyPlan.type === "http") {
          const plan: HttpVerifyPlan = domainVerifyPlan.httpVerifyPlan;
          if (plan) {
            const httpChallenge = getChallenge("http-01");
            if (httpChallenge == null) {
              throw new Error("该域名不支持http-01方式校验");
            }
            return await doHttpVerify(httpChallenge, plan.httpUploader);
          } else {
            throw new Error("未找到域名【" + fullDomain + "】的http校验配置");
          }
        } else {
          throw new Error("不支持的校验类型", domainVerifyPlan.type);
        }
      } else {
        this.logger.warn(`未找到域名${fullDomain}的校验计划，使用默认的dnsProvider`);
      }
    }
    if (!dnsProvider) {
      throw new Error(`域名${fullDomain}没有匹配到任何校验方式，证书申请失败`);
    }

    const dnsChallenge = getChallenge("dns-01");
    checkIpChallenge("dns");
    return await doDnsVerify(dnsChallenge, fullRecord, dnsProvider);
  }

  /**
   * Function used to remove an ACME challenge response
   *
   * @param {object} authz Authorization object
   * @param {object} challenge Selected challenge
   * @param {string} keyAuthorization Authorization key
   * @param recordReq
   * @param recordRes
   * @param dnsProvider dnsProvider
   * @param httpUploader
   * @returns {Promise}
   */

  async challengeRemoveFn(authz: any, challenge: any, keyAuthorization: string, recordReq: any, recordRes: any, dnsProvider?: IDnsProvider, httpUploader?: IOssClient) {
    this.logger.info("执行清理");

    /* http-01 */
    const fullDomain = authz.identifier.value;
    if (challenge.type === "http-01") {
      const filePath = `.well-known/acme-challenge/${challenge.token}`;
      this.logger.info(`Removing challenge response for ${fullDomain} at file: ${filePath}`);
      await httpUploader.remove(filePath);
      this.logger.info(`删除文件【${filePath}】成功`);
    } else if (challenge.type === "dns-01") {
      this.logger.info(`删除 TXT 解析记录:${JSON.stringify(recordReq)} ,recordRes = ${JSON.stringify(recordRes)}`);
      try {
        await dnsProvider.removeRecord({
          recordReq,
          recordRes,
        });
        this.logger.info("删除解析记录成功");
      } catch (e) {
        this.logger.error("删除解析记录出错：", e);
        throw e;
      }
    }
  }

  async order(options: {
    email: string;
    domains: string | string[];
    dnsProvider?: any;
    domainsVerifyPlan?: DomainsVerifyPlan;
    httpUploader?: any;
    csrInfo: any;
    privateKeyType?: string;
    profile?: string;
    preferredChain?: string;
  }): Promise<CertInfo> {
    const { email, csrInfo, dnsProvider, domainsVerifyPlan, profile, preferredChain } = options;
    const client: acme.Client = await this.getAcmeClient(email);

    let domains = options.domains;
    const encodingDomains = [];
    for (const domain of domains) {
      encodingDomains.push(punycode.toASCII(domain));
    }
    domains = encodingDomains;

    /* Create CSR */
    const { altNames } = this.buildCommonNameByDomains(domains);
    let privateKey = null;
    const privateKeyType = options.privateKeyType || "rsa_2048";
    const privateKeyArr = privateKeyType.split("_");
    const type = privateKeyArr[0];
    let size = 2048;
    if (privateKeyArr.length > 1) {
      size = parseInt(privateKeyArr[1]);
    }

    let encodingType = "pkcs8";
    if (privateKeyArr.length > 2) {
      encodingType = privateKeyArr[2];
    }

    if (type == "ec") {
      const name: any = "P-" + size;
      privateKey = await acme.crypto.createPrivateEcdsaKey(name, encodingType);
    } else {
      privateKey = await acme.crypto.createPrivateRsaKey(size, encodingType);
    }

    let createCsr: any = acme.crypto.createCsr;
    if (encodingType === "pkcs1") {
      //兼容老版本
      createCsr = acme.forge.createCsr;
    }
    const csrData: any = {
      // commonName,
      ...csrInfo,
      altNames,
      // emailAddress: email,
    };
    const [key, csr] = await createCsr(csrData, privateKey);

    if (dnsProvider == null && domainsVerifyPlan == null) {
      throw new Error("dnsProvider 、 domainsVerifyPlan不能都为空");
    }

    const providers: Providers = {
      dnsProvider,
      domainsVerifyPlan,
    };
    /* 自动申请证书 */
    const crt = await client.auto({
      csr,
      email: email,
      termsOfServiceAgreed: true,
      skipChallengeVerification: this.skipLocalVerify,
      challengePriority: ["dns-01", "http-01"],
      challengeCreateFn: async (
        authz: acme.Authorization,
        keyAuthorizationGetter: (challenge: Challenge) => Promise<string>
      ): Promise<{ recordReq?: any; recordRes?: any; dnsProvider?: any; challenge: Challenge; keyAuthorization: string }> => {
        return await this.challengeCreateFn(authz, keyAuthorizationGetter, providers);
      },
      challengeRemoveFn: async (authz: acme.Authorization, challenge: Challenge, keyAuthorization: string, recordReq: any, recordRes: any, dnsProvider: IDnsProvider, httpUploader: IOssClient): Promise<any> => {
        return await this.challengeRemoveFn(authz, challenge, keyAuthorization, recordReq, recordRes, dnsProvider, httpUploader);
      },
      signal: this.options.signal,
      profile,
      preferredChain,
      waitDnsDiffuseTime: this.options.waitDnsDiffuseTime,
    });

    const crtString = crt.toString();
    const cert: CertInfo = {
      crt: crtString,
      key: key.toString(),
      csr: csr.toString(),
    };
    /* Done */
    this.logger.debug(`CSR:\n${cert.csr}`);
    this.logger.debug(`Certificate:\n${cert.crt}`);
    this.logger.info("证书申请成功");
    return cert;
  }

  buildCommonNameByDomains(domains: string | string[]): {
    commonName?: string;
    altNames: string[] | undefined;
  } {
    if (typeof domains === "string") {
      domains = domains.split(",");
    }
    if (domains.length === 0) {
      throw new Error("domain can not be empty");
    }

    return {
      // commonName,
      altNames: domains,
    };
  }

  private async testDirectory(directoryUrl: string) {
    try {
      await utils.http.request({
        url: directoryUrl,
        method: "GET",
        timeout: 10000,
      });
    } catch (e) {
      this.logger.error(`${directoryUrl}，测试访问失败`, e.message);
      return false;
    }
    this.logger.info(`${directoryUrl}，测试访问成功`);
    return true;
  }
}
