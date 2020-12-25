import logger from './utils/util.log.js'
import { AcmeService } from './acme.js'
import { FileStore } from './store/file-store.js'
import { DnsProviderFactory } from './dns-provider/dns-provider-factory.js'
import dayjs from 'dayjs'
import path from 'path'
import fs from 'fs'
import forge from 'node-forge'
export class Certd {
  constructor (options = { args: {} }) {
    if (!options.args) {
      options.args = {}
    }
    this.store = new FileStore(options.args)
    this.acme = new AcmeService(this.store)
    this.options = options
  }

  getMainDomain (domains) {
    if (domains == null) {
      return null
    }
    if (typeof domains === 'string') {
      return domains
    }
    if (domains.length > 0) {
      return domains[0]
    }
  }

  buildDomainFileName (domains) {
    const domain = this.getMainDomain(domains)
    return domain.replace(/\*/g, '_')
  }

  buildCertDir (email, domains) {
    const domainFileName = this.buildDomainFileName(domains)
    return path.join(email, '/certs/', domainFileName)
  }

  async certApply (options) {
    if (options == null) {
      options = this.options
    }
    if (options.args == null) {
      options.args = {}
    }
    let oldCert
    try {
      oldCert = this.readCurrentCert(options.cert.email, options.cert.domains)
    } catch (e) {
      logger.warn('读取cert失败：', e)
    }

    if (oldCert == null) {
      logger.info('还未申请过，准备申请新证书')
    } else {
      const ret = this.isWillExpire(oldCert.expires, options.cert.renewDays)
      if (!ret.isWillExpire) {
        logger.info('证书还未过期：', oldCert.expires, ',剩余', ret.leftDays, '天')
        if (options.args.forceCert) {
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
    return await this.doCertApply(options)
  }

  async doCertApply (options) {
    const dnsProvider = await this.createDnsProvider(options)
    const cert = await this.acme.order({
      email: options.cert.email,
      domains: options.cert.domains,
      dnsProvider,
      csrInfo: options.cert.csrInfo,
      isTest: options.args.test
    })

    const certDir = this.writeCert(options.cert.email, options.cert.domains, cert)
    const { detail, expires } = this.getCrtDetail(cert.crt)
    return {
      ...cert,
      detail,
      expires,
      certDir,
      isNew: true
    }
  }

  async createDnsProvider (options) {
    const accessProviders = options.accessProviders
    const providerOptions = accessProviders[options.cert.dnsProvider]
    return await DnsProviderFactory.createByType(providerOptions.providerType, providerOptions)
  }

  writeCert (email, domains, cert) {
    const certFilesRootDir = this.buildCertDir(email, domains)
    const dirPath = path.join(certFilesRootDir, dayjs().format('YYYY.MM.DD.HHmmss'))

    const domainFileName = this.buildDomainFileName(domains)

    this.store.set(path.join(dirPath, `/${domainFileName}.crt`), cert.crt)
    this.store.set(path.join(dirPath, `/${domainFileName}.key`), cert.key)
    this.store.set(path.join(dirPath, `/${domainFileName}.csr`), cert.csr)

    const linkPath = this.store.getActualKey(path.join(certFilesRootDir, 'current'))
    const lastPath = this.store.getActualKey(dirPath)
    if (fs.existsSync(linkPath)) {
      try {
        fs.unlinkSync(linkPath)
      } catch (e) {
        logger.error('unlink error:', e)
      }
    }
    fs.symlinkSync(lastPath, linkPath, 'dir')

    return linkPath
  }

  readCurrentCert (email, domains) {
    const certFilesRootDir = this.buildCertDir(email, domains)
    const currentPath = path.join(certFilesRootDir, 'current')
    const domainFileName = this.buildDomainFileName(domains)

    const crt = this.store.get(currentPath + `/${domainFileName}.crt`)
    if (crt == null) {
      return null
    }
    const key = this.store.get(currentPath + `/${domainFileName}.key`)
    const csr = this.store.get(currentPath + `/${domainFileName}.csr`)

    const { detail, expires } = this.getCrtDetail(crt)

    const certDir = this.store.getActualKey(currentPath)
    return {
      crt, key, csr, detail, expires, certDir
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
}
