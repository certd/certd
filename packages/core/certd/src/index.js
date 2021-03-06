import { util, Store, dnsProviderRegistry } from '@certd/api'
import { AcmeService } from './acme.js'
import { FileStore } from './store/file-store.js'
import { CertStore } from './store/cert-store.js'
import dayjs from 'dayjs'
import forge from 'node-forge'

const logger = util.logger
export class Certd {
  constructor (options) {
    this.options = options
    this.email = options.cert.email
    this.domains = options.cert.domains

    if (!(options.store instanceof Store)) {
      this.store = new FileStore(options.store || {})
    }
    this.certStore = new CertStore({
      store: this.store,
      email: options.cert.email,
      domains: this.domains
    })
    this.acme = new AcmeService(this.store)
  }

  async certApply () {
    let oldCert
    try {
      oldCert = await this.readCurrentCert()
    } catch (e) {
      logger.warn('读取cert失败：', e)
    }

    if (oldCert == null) {
      logger.info('还未申请过，准备申请新证书')
    } else {
      const ret = this.isWillExpire(oldCert.expires, this.options.cert.renewDays)
      if (!ret.isWillExpire) {
        logger.info('证书还未过期：', oldCert.expires, ',剩余', ret.leftDays, '天')
        if (this.options.args.forceCert) {
          logger.info('准备强制更新证书')
        } else {
          logger.info('暂不更新证书')

          oldCert.isNew = false
          return oldCert
        }
      } else {
        logger.info('即将过期，准备更新证书')
      }
    }

    // 执行证书申请步骤
    return await this.doCertApply()
  }

  async doCertApply () {
    const options = this.options
    const dnsProvider = this.createDnsProvider(options)
    const cert = await this.acme.order({
      email: options.cert.email,
      domains: options.cert.domains,
      dnsProvider,
      csrInfo: options.cert.csrInfo,
      isTest: options.args.test
    })

    await this.writeCert(cert)
    const certRet = await this.readCurrentCert()
    certRet.isNew = true
    return certRet
  }

  createDnsProvider (options) {
    return this.createProviderByType(options.cert.dnsProvider, options.accessProviders)
  }

  async writeCert (cert) {
    const newPath = await this.certStore.writeCert(cert)
    return {
      realPath: this.certStore.store.getActualKey(newPath),
      currentPath: this.certStore.store.getActualKey(this.certStore.currentMarkPath)
    }
  }

  async readCurrentCert () {
    const cert = await this.certStore.readCert()
    if (cert == null) {
      return null
    }
    const { detail, expires } = this.getCrtDetail(cert.crt)
    const domain = this.certStore.getMainDomain(this.options.cert.domains)
    return {
      ...cert, detail, expires, domain, domains: this.domains, email: this.email
    }
  }

  getCrtDetail (crt) {
    const pki = forge.pki
    const detail = pki.certificateFromPem(crt.toString())
    const expires = detail.validity.notAfter
    return { detail, expires }
  }

  /**
     * 检查是否过期，默认提前20天
     * @param expires
     * @param maxDays
     * @returns {boolean}
     */
  isWillExpire (expires, maxDays = 20) {
    if (expires == null) {
      throw new Error('过期时间不能为空')
    }
    // 检查有效期
    const leftDays = dayjs(expires).diff(dayjs(), 'day')
    return {
      isWillExpire: leftDays < maxDays,
      leftDays
    }
  }

  createProviderByType (props, accessProviders) {
    const { type } = props
    const Provider = dnsProviderRegistry.get(type)
    if (Provider == null) {
      throw new Error('暂不支持此dnsProvider,请先注册该provider：' + type)
    }
    return new Provider({ accessProviders, props })
  }
}
