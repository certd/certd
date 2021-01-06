import dnsProviders from './index.js'

export class DnsProviderFactory {
  static createByType (type, options) {
    try {
      const Provider = dnsProviders[type]
      return new Provider(options)
    } catch (e) {
      throw new Error('暂不支持此dnsProvider：' + type, e)
    }
  }
}
