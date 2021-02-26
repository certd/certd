import dayjs from 'dayjs'
import crypto from 'crypto'
// eslint-disable-next-line no-unused-vars
function md5 (content) {
  return crypto.createHash('md5').update(content).digest('hex')
}
export class CertStore {
  constructor ({ store, email, domains }) {
    this.store = store
    this.email = email
    this.domains = domains
    this.domain = this.getMainDomain(this.domains)
    this.safetyDomain = this.getSafetyDomain(this.domain)
    this.domainDir = this.safetyDomain + '-' + md5(this.getDomainStr(this.domains))
    // this.domainDir = this.safetyDomain
    this.certsRootPath = this.store.buildKey(this.email, 'certs')

    this.currentMarkPath = this.store.buildKey(this.certsRootPath, this.domainDir, 'current.json')
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

  getDomainStr (domains) {
    if (domains == null) {
      return null
    }
    if (typeof domains === 'string') {
      return domains
    }
    return domains.join(',')
  }

  buildNewCertRootPath (dir) {
    if (dir == null) {
      dir = dayjs().format('YYYY.MM.DD.HHmmss')
    }
    return this.store.buildKey(this.certsRootPath, this.domainDir, dir)
  }

  formatCert (pem) {
    pem = pem.replace(/\r/g, '')
    pem = pem.replace(/\n\n/g, '\n')
    pem = pem.replace(/\n$/g, '')
    return pem
  }

  async writeCert (cert) {
    const newDir = this.buildNewCertRootPath()

    const crtKey = this.buildKey(newDir, this.safetyDomain + '.crt')
    const priKey = this.buildKey(newDir, this.safetyDomain + '.key')
    const csrKey = this.buildKey(newDir, this.safetyDomain + '.csr')
    await this.store.set(crtKey, this.formatCert(cert.crt.toString()))
    await this.store.set(priKey, this.formatCert(cert.key.toString()))
    await this.store.set(csrKey, cert.csr.toString())

    await this.store.set(this.currentMarkPath, JSON.stringify({ latest: newDir }))

    return newDir
  }

  async readCert (dir) {
    if (dir == null) {
      dir = await this.getCurrentDir()
    }
    if (dir == null) {
      return
    }

    const crtKey = this.buildKey(dir, this.safetyDomain + '.crt')
    const priKey = this.buildKey(dir, this.safetyDomain + '.key')
    const csrKey = this.buildKey(dir, this.safetyDomain + '.csr')
    const crt = await this.store.get(crtKey)
    if (crt == null) {
      return null
    }
    const key = await this.store.get(priKey)
    const csr = await this.store.get(csrKey)

    return {
      crt: this.formatCert(crt),
      key: this.formatCert(key),
      csr,
      crtPath: this.store.getActualKey(crtKey),
      keyPath: this.store.getActualKey(priKey),
      certDir: this.store.getActualKey(dir)
    }
  }

  buildKey (...keyItem) {
    return this.store.buildKey(...keyItem)
  }

  getSafetyDomain (domain) {
    return domain.replace(/\*/g, '_')
  }

  async getCurrentDir () {
    const current = await this.store.get(this.currentMarkPath)
    if (current == null) {
      return null
    }
    return JSON.parse(current).latest
  }

  async getCurrentFile (file) {
    const currentDir = await this.getCurrentDir()
    const key = this.buildKey(currentDir, file)
    return this.store.get(key)
  }

  async setCurrentFile (file, value) {
    const currentDir = await this.getCurrentDir()
    const key = this.buildKey(currentDir, file)
    return this.store.set(key, value)
  }
}
