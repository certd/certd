// @ts-ignore
import * as acme from "@certd/acme-client";
import _ from "lodash-es";
import { Challenge } from "@certd/acme-client/types/rfc8555";
import { Logger } from "log4js";
import { IContext } from "@certd/pipeline";
import { IDnsProvider } from "../../dns-provider/index.js";
import psl from "psl";
import { ClientExternalAccountBindingOptions, UrlMapping } from "@certd/acme-client";

export type CertInfo = {
  crt: string;
  key: string;
  csr: string;
};
export type SSLProvider = "letsencrypt" | "google" | "zerossl";
export type PrivateKeyType = "rsa_1024" | "rsa_2048" | "rsa_3072" | "rsa_4096" | "ec_256" | "ec_384" | "ec_521";
type AcmeServiceOptions = {
  userContext: IContext;
  logger: Logger;
  sslProvider: SSLProvider;
  eab?: ClientExternalAccountBindingOptions;
  skipLocalVerify?: boolean;
  useMappingProxy?: boolean;
  privateKeyType?: PrivateKeyType;
  signal?: AbortSignal;
};

export class AcmeService {
  options: AcmeServiceOptions;
  userContext: IContext;
  logger: Logger;
  sslProvider: SSLProvider;
  skipLocalVerify = true;
  eab?: ClientExternalAccountBindingOptions;
  constructor(options: AcmeServiceOptions) {
    this.options = options;
    this.userContext = options.userContext;
    this.logger = options.logger;
    this.sslProvider = options.sslProvider || "letsencrypt";
    this.eab = options.eab;
    this.skipLocalVerify = options.skipLocalVerify ?? false;
    acme.setLogger((text: string) => {
      this.logger.info(text);
    });
  }

  async getAccountConfig(email: string, urlMapping: UrlMapping): Promise<any> {
    const conf = (await this.userContext.getObj(this.buildAccountKey(email))) || {};
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

  async saveAccountConfig(email: string, conf: any) {
    await this.userContext.setObj(this.buildAccountKey(email), conf);
  }

  async getAcmeClient(email: string, isTest = false): Promise<acme.Client> {
    const urlMapping: UrlMapping = {
      enabled: false,
      mappings: {
        "acme-v02.api.letsencrypt.org": "letsencrypt.proxy.handsfree.work",
        "dv.acme-v02.api.pki.goog": "google.proxy.handsfree.work",
      },
    };
    const conf = await this.getAccountConfig(email, urlMapping);
    if (conf.key == null) {
      conf.key = await this.createNewKey();
      await this.saveAccountConfig(email, conf);
    }
    let directoryUrl = "";
    if (isTest) {
      directoryUrl = acme.directory[this.sslProvider].staging;
    } else {
      directoryUrl = acme.directory[this.sslProvider].production;
    }
    if (this.options.useMappingProxy) {
      urlMapping.enabled = true;
    }
    const client = new acme.Client({
      directoryUrl: directoryUrl,
      accountKey: conf.key,
      accountUrl: conf.accountUrl,
      externalAccountBinding: this.eab,
      backoffAttempts: 15,
      backoffMin: 5000,
      backoffMax: 10000,
      urlMapping,
      signal: this.options.signal,
    });

    if (conf.accountUrl == null) {
      const accountPayload = {
        termsOfServiceAgreed: true,
        contact: [`mailto:${email}`],
        externalAccountBinding: this.eab,
      };
      await client.createAccount(accountPayload);
      conf.accountUrl = client.getAccountUrl();
      await this.saveAccountConfig(email, conf);
    }
    return client;
  }

  async createNewKey() {
    const key = await acme.forge.createPrivateKey();
    return key.toString();
  }

  parseDomain(fullDomain: string) {
    const parsed = psl.parse(fullDomain) as psl.ParsedDomain;
    if (parsed.error) {
      throw new Error(`解析${fullDomain}域名失败:` + JSON.stringify(parsed.error));
    }
    return parsed.domain as string;
  }
  async challengeCreateFn(authz: any, challenge: any, keyAuthorization: string, dnsProvider: IDnsProvider) {
    this.logger.info("Triggered challengeCreateFn()");

    /* http-01 */
    const fullDomain = authz.identifier.value;
    if (challenge.type === "http-01") {
      const filePath = `/var/www/html/.well-known/acme-challenge/${challenge.token}`;
      const fileContents = keyAuthorization;

      this.logger.info(`Creating challenge response for ${fullDomain} at path: ${filePath}`);

      /* Replace this */
      this.logger.info(`Would write "${fileContents}" to path "${filePath}"`);
      // await fs.writeFileAsync(filePath, fileContents);
    } else if (challenge.type === "dns-01") {
      /* dns-01 */
      const dnsRecord = `_acme-challenge.${fullDomain}`;
      const recordValue = keyAuthorization;

      this.logger.info(`Creating TXT record for ${fullDomain}: ${dnsRecord}`);
      /* Replace this */
      this.logger.info(`Would create TXT record "${dnsRecord}" with value "${recordValue}"`);

      const domain = this.parseDomain(fullDomain);
      this.logger.info("解析到域名domain=", domain);
      return await dnsProvider.createRecord({
        fullRecord: dnsRecord,
        type: "TXT",
        value: recordValue,
        domain,
      });
    }
  }

  /**
   * Function used to remove an ACME challenge response
   *
   * @param {object} authz Authorization object
   * @param {object} challenge Selected challenge
   * @param {string} keyAuthorization Authorization key
   * @param recordItem  challengeCreateFn create record item
   * @param dnsProvider dnsProvider
   * @returns {Promise}
   */

  async challengeRemoveFn(authz: any, challenge: any, keyAuthorization: string, recordItem: any, dnsProvider: IDnsProvider) {
    this.logger.info("Triggered challengeRemoveFn()");

    /* http-01 */
    const fullDomain = authz.identifier.value;
    if (challenge.type === "http-01") {
      const filePath = `/var/www/html/.well-known/acme-challenge/${challenge.token}`;

      this.logger.info(`Removing challenge response for ${fullDomain} at path: ${filePath}`);

      /* Replace this */
      this.logger.info(`Would remove file on path "${filePath}"`);
      // await fs.unlinkAsync(filePath);
    } else if (challenge.type === "dns-01") {
      const dnsRecord = `_acme-challenge.${fullDomain}`;
      const recordValue = keyAuthorization;

      this.logger.info(`Removing TXT record for ${fullDomain}: ${dnsRecord}`);

      /* Replace this */
      this.logger.info(`Would remove TXT record "${dnsRecord}" with value "${recordValue}"`);

      const domain = this.parseDomain(fullDomain);

      try {
        await dnsProvider.removeRecord({
          fullRecord: dnsRecord,
          type: "TXT",
          value: keyAuthorization,
          record: recordItem,
          domain,
        });
      } catch (e) {
        this.logger.error("删除解析记录出错：", e);
        throw e;
      }
    }
  }

  async order(options: {
    email: string;
    domains: string | string[];
    dnsProvider: any;
    csrInfo: any;
    isTest?: boolean;
    privateKeyType?: string;
  }): Promise<CertInfo> {
    const { email, isTest, domains, csrInfo, dnsProvider } = options;
    const client: acme.Client = await this.getAcmeClient(email, isTest);

    /* Create CSR */
    const { commonName, altNames } = this.buildCommonNameByDomains(domains);
    let privateKey = null;
    const privateKeyType = options.privateKeyType || "rsa_2048";
    const privateKeyArr = privateKeyType.split("_");
    const type = privateKeyArr[0];
    const size = parseInt(privateKeyArr[1]);
    if (type == "ec") {
      const name: any = "P-" + size;
      privateKey = await acme.crypto.createPrivateEcdsaKey(name);
    } else {
      privateKey = await acme.crypto.createPrivateRsaKey(size);
    }
    const [key, csr] = await acme.crypto.createCsr(
      {
        commonName,
        ...csrInfo,
        altNames,
      },
      privateKey
    );
    if (dnsProvider == null) {
      throw new Error("dnsProvider 不能为空");
    }
    /* 自动申请证书 */
    const crt = await client.auto({
      csr,
      email: email,
      termsOfServiceAgreed: true,
      skipChallengeVerification: this.skipLocalVerify,
      challengePriority: ["dns-01"],
      challengeCreateFn: async (authz: acme.Authorization, challenge: Challenge, keyAuthorization: string): Promise<any> => {
        return await this.challengeCreateFn(authz, challenge, keyAuthorization, dnsProvider);
      },
      challengeRemoveFn: async (authz: acme.Authorization, challenge: Challenge, keyAuthorization: string, recordItem: any): Promise<any> => {
        return await this.challengeRemoveFn(authz, challenge, keyAuthorization, recordItem, dnsProvider);
      },
      signal: this.options.signal,
    });

    const cert: CertInfo = {
      crt: crt.toString(),
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
    commonName: string;
    altNames: string[] | undefined;
  } {
    if (typeof domains === "string") {
      domains = domains.split(",");
    }
    if (domains.length === 0) {
      throw new Error("domain can not be empty");
    }
    const commonName = domains[0];
    let altNames: undefined | string[] = undefined;
    if (domains.length > 1) {
      altNames = _.slice(domains, 1);
    }
    return {
      commonName,
      altNames,
    };
  }
}
