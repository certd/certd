import { AcmeService } from './acme.js'
import { FileStore } from './store/file-store.js'
import { DnsProviderFactory } from './dns-provider/dns-provider-factory.js'
import dayjs from 'dayjs'
import path from 'path'
import _ from 'lodash'
import fs from 'fs'
import util from './utils/util.js'
import forge from 'node-forge'
process.env.DEBUG = '*'
export class Certd {
  constructor (options) {
    this.store = new FileStore()
    this.acme = new AcmeService(this.store)
    this.options = options
  }

  buildCertDir (email, domains) {
    let domainStr = _.join(domains)
    domainStr = domainStr.replace(/\*/g, '')
    const dir = path.join(email, '/certs/', domainStr)
    return dir
  }

  async certApply (options) {
    if (options == null) {
      options = this.options
    }
    const certOptions = options.cert
    const accessProviders = options.accessProviders
    const providerOptions = accessProviders[certOptions.challenge.dnsProvider]
    const dnsProvider = await DnsProviderFactory.createByType(providerOptions.providerType, providerOptions)
    const cert = await this.acme.order({
      email: certOptions.email,
      domains: certOptions.domains,
      dnsProvider: dnsProvider,
      csrInfo: certOptions.csrInfo

    })

    this.writeCert(certOptions.email, certOptions.domains, cert)
    const { detail, expires } = this.getDetailFromCrt(cert.crt)
    return {
      ...cert,
      detail,
      expires
    }
  }

  writeCert (email, domains, cert) {
    const certFilesRootDir = this.buildCertDir(email, domains)
    const dirPath = path.join(certFilesRootDir, dayjs().format('YYYY.MM.DD.HHmmss'))
    this.store.set(path.join(dirPath, '/cert.crt'), cert.crt)
    this.store.set(path.join(dirPath, '/cert.key'), cert.key)
    this.store.set(path.join(dirPath, '/cert.csr'), cert.csr)

    const linkPath = path.join(util.getUserBasePath(), certFilesRootDir, 'current')
    const lastPath = path.join(util.getUserBasePath(), dirPath)
    // if (!fs.existsSync(linkPath)) {
    //   fs.mkdirSync(linkPath)
    // }
    fs.symlinkSync(lastPath, linkPath)
  }

  readCurrentCert (email, domains) {
    const certFilesRootDir = this.buildCertDir(email, domains)
    const currentPath = path.join(certFilesRootDir, 'current')

    const crt = this.store.get(currentPath + '/cert.crt')
    const key = this.store.get(currentPath + '/cert.key')
    const csr = this.store.get(currentPath + '/cert.csr')

    const { detail, expires } = this.getDetailFromCrt(crt)

    const cert = {
      crt, key, csr, detail, expires
    }
    return cert
  }

  getDetailFromCrt (crt) {
    const pki = forge.pki
    const detail = pki.certificateFromPem(crt.toString())
    const expires = detail.validity.notAfter
    return { detail, expires }
  }
}
