import log from './utils/util.log.js'
import acme from '@certd/acme-client'
import _ from 'lodash'
export class AcmeService {
  constructor (store) {
    this.store = store
  }

  async getAccountConfig (email) {
    let conf = this.store.get(this.buildAccountPath(email))
    if (conf == null) {
      conf = {}
    } else {
      conf = JSON.parse(conf)
    }
    return conf
  }

  buildAccountPath (email) {
    return this.store.buildKey(email, 'account.json')
  }

  saveAccountConfig (email, conf) {
    this.store.set(this.buildAccountPath(email), JSON.stringify(conf))
  }

  async getAcmeClient (email, isTest) {
    const conf = await this.getAccountConfig(email)
    if (conf.key == null) {
      conf.key = await this.createNewKey()
      this.saveAccountConfig(email, conf)
    }
    if (isTest == null) {
      isTest = process.env.CERTD_MODE === 'test'
    }
    const client = new acme.Client({
      directoryUrl: isTest ? acme.directory.letsencrypt.staging : acme.directory.letsencrypt.production,
      accountKey: conf.key,
      accountUrl: conf.accountUrl,
      backoffAttempts: 20,
      backoffMin: 5000,
      backoffMax: 10000
    })

    if (conf.accountUrl == null) {
      const accountPayload = { termsOfServiceAgreed: true, contact: [`mailto:${email}`] }
      await client.createAccount(accountPayload)
      conf.accountUrl = client.getAccountUrl()
      this.saveAccountConfig(email, conf)
    }
    return client
  }

  async createNewKey () {
    const key = await acme.forge.createPrivateKey()
    return key.toString()
  }

  async challengeCreateFn (authz, challenge, keyAuthorization, dnsProvider) {
    log.info('Triggered challengeCreateFn()')

    /* http-01 */
    if (challenge.type === 'http-01') {
      const filePath = `/var/www/html/.well-known/acme-challenge/${challenge.token}`
      const fileContents = keyAuthorization

      log.info(`Creating challenge response for ${authz.identifier.value} at path: ${filePath}`)

      /* Replace this */
      log.info(`Would write "${fileContents}" to path "${filePath}"`)
      // await fs.writeFileAsync(filePath, fileContents);
    } else if (challenge.type === 'dns-01') {
      /* dns-01 */
      const dnsRecord = `_acme-challenge.${authz.identifier.value}`
      const recordValue = keyAuthorization

      log.info(`Creating TXT record for ${authz.identifier.value}: ${dnsRecord}`)

      /* Replace this */
      log.info(`Would create TXT record "${dnsRecord}" with value "${recordValue}"`)

      return await dnsProvider.createRecord({
        fullRecord: dnsRecord,
        type: 'TXT',
        value: recordValue
      })
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

  async challengeRemoveFn (authz, challenge, keyAuthorization, recordItem, dnsProvider) {
    log.info('Triggered challengeRemoveFn()')

    /* http-01 */
    if (challenge.type === 'http-01') {
      const filePath = `/var/www/html/.well-known/acme-challenge/${challenge.token}`

      log.info(`Removing challenge response for ${authz.identifier.value} at path: ${filePath}`)

      /* Replace this */
      log.info(`Would remove file on path "${filePath}"`)
      // await fs.unlinkAsync(filePath);
    } else if (challenge.type === 'dns-01') {
      const dnsRecord = `_acme-challenge.${authz.identifier.value}`
      const recordValue = keyAuthorization

      log.info(`Removing TXT record for ${authz.identifier.value}: ${dnsRecord}`)

      /* Replace this */
      log.info(`Would remove TXT record "${dnsRecord}" with value "${recordValue}"`)
      await dnsProvider.removeRecord({
        fullRecord: dnsRecord,
        type: 'TXT',
        value: keyAuthorization,
        record: recordItem
      })
    }
  }

  async order ({ email, domains, dnsProvider, dnsProviderCreator, csrInfo, isTest }) {
    const client = await this.getAcmeClient(email, isTest)

    let accountUrl
    try {
      accountUrl = client.getAccountUrl()
    } catch (e) {
    }

    /* Create CSR */
    const { commonName, altNames } = this.buildCommonNameByDomains(domains)

    const [key, csr] = await acme.forge.createCsr({
      commonName,
      ...csrInfo,
      altNames
    })
    if (dnsProvider == null && dnsProviderCreator) {
      dnsProvider = await dnsProviderCreator()
    }
    if (dnsProvider == null) {
      throw new Error('dnsProvider 不能为空')
    }
    /* 自动申请证书 */
    const crt = await client.auto({
      csr,
      email: email,
      termsOfServiceAgreed: true,
      challengePriority: ['dns-01'],
      challengeCreateFn: async (authz, challenge, keyAuthorization) => {
        return await this.challengeCreateFn(authz, challenge, keyAuthorization, dnsProvider)
      },
      challengeRemoveFn: async (authz, challenge, keyAuthorization, recordItem) => {
        return await this.challengeRemoveFn(authz, challenge, keyAuthorization, recordItem, dnsProvider)
      }
    })

    // 保存账号url
    if (!accountUrl) {
      try {
        accountUrl = client.getAccountUrl()
        this.setAccountUrl(email, accountUrl)
      } catch (e) {
        log.warn('保存accountUrl出错', e)
      }
    }
    /* Done */
    log.debug(`CSR:\n${csr.toString()}`)
    log.debug(`Certificate:\n${crt.toString()}`)
    log.info('证书申请成功')
    return { key, crt, csr }
  }

  buildCommonNameByDomains (domains) {
    if (typeof domains === 'string') {
      domains = domains.split(',')
    }
    if (domains.length === 0) {
      throw new Error('domain can not be empty')
    }
    const ret = {
      commonName: domains[0]
    }
    if (domains.length > 1) {
      ret.altNames = _.slice(domains, 1)
    }
    return ret
  }
}
