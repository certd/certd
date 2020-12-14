import acme from './acme/index.cjs'
import log from './utils/util.log.js'
import _ from 'lodash'
import sleep from './utils/util.sleep.js'
export class AcmeService {
  constructor (store) {
    this.store = store
  }

  async getAccountKey (email) {
    let key = this.store.get(this.buildAccountKeyPath(email))
    if (key == null) {
      key = await this.createNewKey({ email })
    }
    return key
  }

  buildAccountKeyPath (email) {
    return email + '/acme/account.key'
  }

  setAccountKey (email, privateKey) {
    this.store.set(this.buildAccountKeyPath(email), privateKey)
  }

  async getAcmeClient (email) {
    const key = await this.getAccountKey(email)
    const client = new acme.Client({
      directoryUrl: acme.directory.letsencrypt.staging,
      accountKey: key
    })
    return client
  }

  async createNewKey ({ email }) {
    const privateKey = await acme.forge.createPrivateKey()
    this.setAccountKey(email, privateKey)
  }

  async loggerin () {

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

      try {
        await dnsProvider.createRecord(dnsRecord, 'TXT', recordValue)
      } catch (e) {
        if (e.code === 'DomainRecordDuplicate') {
          await dnsProvider.removeRecord(dnsRecord, 'TXT')
          await sleep(1000)
          await dnsProvider.createRecord(dnsRecord, 'TXT', recordValue)
        }
      }
    }
  }

  /**
   * Function used to remove an ACME challenge response
   *
   * @param {object} authz Authorization object
   * @param {object} challenge Selected challenge
   * @param {string} keyAuthorization Authorization key
   * @returns {Promise}
   */

  async challengeRemoveFn (authz, challenge, keyAuthorization, dnsProvider) {
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
      await dnsProvider.removeRecord(dnsRecord, 'TXT', keyAuthorization)
    }
  }

  async order ({ email, domains, dnsProvider, csrInfo }) {
    const client = await this.getAcmeClient(email)
    /* Create CSR */
    const { commonName, altNames } = this.buildCommonNameByDomains(domains)

    const [key, csr] = await acme.forge.createCsr({
      commonName,
      ...csrInfo,
      altNames
    })

    /* Certificate */
    const crt = await client.auto({
      csr,
      email: email,
      termsOfServiceAgreed: true,
      challengePriority: ['dns-01', 'http-01'],
      challengeCreateFn: (authz, challenge, keyAuthorization) => {
        return this.challengeCreateFn(authz, challenge, keyAuthorization, dnsProvider)
      },
      challengeRemoveFn: (authz, challenge, keyAuthorization) => {
        return this.challengeRemoveFn(authz, challenge, keyAuthorization, dnsProvider)
      }
    })

    /* Done */
    log.info(`CSR:\n${csr.toString()}`)
    log.info(`Private key:\n${key.toString()}`)
    log.info(`Certificate:\n${crt.toString()}`)

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
