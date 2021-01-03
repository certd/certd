export class DnsProviderFactory {
  static async createByType (type, options) {
    try {
      const ProviderModule = await import('./impl/' + type + '.js')
      const Provider = ProviderModule.default
      return new Provider(options)
    } catch (e) {
      throw new Error('暂不支持此dnsProvider：' + type, e)
    }
  }
}
