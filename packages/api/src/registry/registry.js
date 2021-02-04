
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
    const defineName = (target.define && target.define().name) || target.name
    this.register(defineName, target)
  }

  register (key, value) {
    if (!key || value == null) {
      return
    }
    this.collection[key] = value
  }

  get (name) {
    if (name) {
      return this.collection[name]
    }

    throw new Error(`${name} not found`)
  }
}
