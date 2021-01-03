import dayjs from 'dayjs'
export class CertStore {
  constructor ({ store, email, domain }) {
    this.store = store
    this.email = email
    this.domain = domain
    this.safetyDomain = this.getSafetyDomain(this.domain)

    this.certsRootPath = this.store.buildKey(this.email, 'certs')

    this.currentRootPath = this.store.buildKey(this.certsRootPath, this.safetyDomain, 'current')
  }

  // getAccountConfig () {
  //   return this.store.get(this.accountConfigKey)
  // }
  //
  // setAccountConfig (email, account) {
  //   return this.store.set(this.accountConfigKey, account)
  // }

  buildNewCertRootPath (dir) {
    if (dir == null) {
      dir = dayjs().format('YYYY.MM.DD.HHmmss')
    }
    return this.store.buildKey(this.certsRootPath, this.safetyDomain, dir)
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

    await this.store.link(newDir, this.currentRootPath)

    return newDir
  }

  async readCert (dir) {
    if (dir == null) {
      dir = this.currentRootPath
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

  getCurrentFile (file) {
    const key = this.buildKey(this.currentRootPath, file)
    return this.store.get(key)
  }

  setCurrentFile (file, value) {
    const key = this.buildKey(this.currentRootPath, file)
    return this.store.set(key, value)
  }
}
