export class Registry {
  constructor () {
    this.collection = {}
  }

  install (target) {
    if (target == null) {
      return
    }
    if (this.collection == null) {
      this.collection = {}
    }
    let defineName = target.define ? target.define().name : null
    if (defineName == null) {
      defineName = target.name
    }

    this.register(defineName, target)
  }

  register (key, value) {
    if (!key || value == null) {
      return
    }
    this.collection[key] = value
  }

  get (name) {
    if (!name) {
      throw new Error('插件名称不能为空')
    }

    if (!this.collection) {
      this.collection = {}
    }
    const plugin = this.collection[name]
    if (!plugin) {
      throw new Error(`插件${name}还未注册`)
    }
    return plugin
  }

  getCollection () {
    return this.collection
  }
}
