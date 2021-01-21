
export class PluginRegistry {
  constructor () {
    this.plugins = {}
  }

  install (plugin) {
    if (plugin == null) {
      return
    }
    if (this.plugins == null) {
      this.plugins = {}
    }
    const name = plugin.name || (plugin.define && plugin.define.name)
    this.plugins[name] = plugin
  }

  get (name) {
    if (name) {
      return this.plugins[name]
    }

    throw new Error(`找不到${name}插件`)
  }
}

export const pluginRegistry = new PluginRegistry()
