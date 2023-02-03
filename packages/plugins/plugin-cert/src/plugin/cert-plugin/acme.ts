// @ts-ignore
import * as acme from "@certd/acme-client";
import _ from "lodash";
import { Challenge } from "@certd/acme-client/types/rfc8555";
import { Logger } from "log4js";
import { IContext } from "@certd/pipeline/src/core/context";
import { IDnsProvider } from "../../dns-provider";

export class AcmeService {
  userContext: IContext;
  logger: Logger;
  constructor(options: { userContext: IContext; logger: Logger }) {
    this.userContext = options.userContext;
    this.logger = options.logger;
    acme.setLogger((text: string) => {
      this.logger.info(text);
    });
  }

  async getAccountConfig(email: string) {
    return (await this.userContext.get(this.buildAccountKey(email))) || {};
  }

  buildAccountKey(email: string) {
    return "acme.config." + email;
  }

  async saveAccountConfig(email: string, conf: any) {
    await this.userContext.set(this.buildAccountKey(email), conf);
  }

  async getAcmeClient(email: string, isTest = false): Promise<acme.Client> {
    const conf = await this.getAccountConfig(email);
    if (conf.key == null) {
      conf.key = await this.createNewKey();
      await this.saveAccountConfig(email, conf);
    }
    const client = new acme.Client({
      directoryUrl: isTest ? acme.directory.letsencrypt.staging : acme.directory.letsencrypt.production,
      accountKey: conf.key,
      accountUrl: conf.accountUrl,
      backoffAttempts: 20,
      backoffMin: 5000,
      backoffMax: 10000,
    });

    if (conf.accountUrl == null) {
      const accountPayload = {
        termsOfServiceAgreed: true,
        contact: [`mailto:${email}`],
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

  async challengeCreateFn(authz: any, challenge: any, keyAuthorization: string, dnsProvider: IDnsProvider) {
    this.logger.info("Triggered challengeCreateFn()");

    /* http-01 */
    if (challenge.type === "http-01") {
      const filePath = `/var/www/html/.well-known/acme-challenge/${challenge.token}`;
      const fileContents = keyAuthorization;

      this.logger.info(`Creating challenge response for ${authz.identifier.value} at path: ${filePath}`);

      /* Replace this */
      this.logger.info(`Would write "${fileContents}" to path "${filePath}"`);
      // await fs.writeFileAsync(filePath, fileContents);
    } else if (challenge.type === "dns-01") {
      /* dns-01 */
      const dnsRecord = `_acme-challenge.${authz.identifier.value}`;
      const recordValue = keyAuthorization;

      this.logger.info(`Creating TXT record for ${authz.identifier.value}: ${dnsRecord}`);

      /* Replace this */
      this.logger.info(`Would create TXT record "${dnsRecord}" with value "${recordValue}"`);

      return await dnsProvider.createRecord({
        fullRecord: dnsRecord,
        type: "TXT",
        value: recordValue,
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
    if (challenge.type === "http-01") {
      const filePath = `/var/www/html/.well-known/acme-challenge/${challenge.token}`;

      this.logger.info(`Removing challenge response for ${authz.identifier.value} at path: ${filePath}`);

      /* Replace this */
      this.logger.info(`Would remove file on path "${filePath}"`);
      // await fs.unlinkAsync(filePath);
    } else if (challenge.type === "dns-01") {
      const dnsRecord = `_acme-challenge.${authz.identifier.value}`;
      const recordValue = keyAuthorization;

      this.logger.info(`Removing TXT record for ${authz.identifier.value}: ${dnsRecord}`);

      /* Replace this */
      this.logger.info(`Would remove TXT record "${dnsRecord}" with value "${recordValue}"`);
      await dnsProvider.removeRecord({
        fullRecord: dnsRecord,
        type: "TXT",
        value: keyAuthorization,
        record: recordItem,
      });
    }
  }

  async order(options: { email: string; domains: string | string[]; dnsProvider: any; csrInfo: any; isTest?: boolean }) {
    const { email, isTest, domains, csrInfo, dnsProvider } = options;
    const client: acme.Client = await this.getAcmeClient(email, isTest);

    /* Create CSR */
    const { commonName, altNames } = this.buildCommonNameByDomains(domains);

    const [key, csr] = await acme.forge.createCsr({
      commonName,
      ...csrInfo,
      altNames,
    });
    if (dnsProvider == null) {
      throw new Error("dnsProvider 不能为空");
    }
    /* 自动申请证书 */
    const crt = await client.auto({
      csr,
      email: email,
      termsOfServiceAgreed: true,
      challengePriority: ["dns-01"],
      challengeCreateFn: async (authz: acme.Authorization, challenge: Challenge, keyAuthorization: string): Promise<any> => {
        return await this.challengeCreateFn(authz, challenge, keyAuthorization, dnsProvider);
      },
      challengeRemoveFn: async (authz: acme.Authorization, challenge: Challenge, keyAuthorization: string, recordItem: any): Promise<any> => {
        return await this.challengeRemoveFn(authz, challenge, keyAuthorization, recordItem, dnsProvider);
      },
    });

    const cert = {
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
