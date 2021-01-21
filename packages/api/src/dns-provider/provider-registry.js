
export class ProviderRegistry {
  constructor () {
    this.providers = {}
  }

  install (provider) {
    if (provider == null) {
      return
    }
    if (this.providers == null) {
      this.providers = {}
    }
    const name = provider.name || (provider.define && provider.define.name)
    this.providers[name] = provider
  }

  get (name) {
    if (name) {
      return this.providers[name]
    }
    throw new Error(`找不到授权提供者:${name}`)
  }
}

export const providerRegistry = new ProviderRegistry()
