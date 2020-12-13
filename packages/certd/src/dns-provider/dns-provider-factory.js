export class DnsProviderFactory {
  static async createByType (type, options) {
    const ProviderModule = await import('./impl/' + type + '.js')
    const Provider = ProviderModule.default
    return new Provider(options)
  }
}
