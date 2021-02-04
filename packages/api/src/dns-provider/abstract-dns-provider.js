import _ from 'lodash-es'
import logger from '../utils/util.log.js'
export class AbstractDnsProvider {
  constructor ({ accessProviders }) {
    this.logger = logger
    this.accessProviders = accessProviders
  }

  async createRecord ({ fullRecord, type, value }) {
    throw new Error('请实现 createRecord 方法')
  }

  async removeRecord ({ fullRecord, type, value, record }) {
    throw new Error('请实现 removeRecord 方法')
  }

  async getDomainList () {
    throw new Error('请实现 getDomainList 方法')
  }

  async matchDomain (dnsRecord, domainPropName) {
    const list = await this.getDomainList()
    let domain = null
    for (const item of list) {
      if (_.endsWith(dnsRecord, item[domainPropName])) {
        domain = item
        break
      }
    }
    if (!domain) {
      throw new Error('找不到域名,请检查域名是否正确：' + dnsRecord)
    }
    return domain
  }

  getAccessProvider (accessProvider, accessProviders = this.accessProviders) {
    if (typeof accessProvider === 'string' && accessProviders) {
      accessProvider = accessProviders[accessProvider]
    }
    return accessProvider
  }
}
