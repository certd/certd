export class Registry {
  constructor () {
    this.collection = new Map()
  }

  install (target) {
    if (target == null) {
      return
    }
    if (this.collection == null) {
      this.collection = new Map()
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
    this.collection.set(key, value)
  }

  get (name) {
    if (name) {
      return this.collection.get(name)
    }

    throw new Error(`${name} not found`)
  }

  getCollection () {
    return this.collection
  }
}
