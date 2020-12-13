import { Store } from './store.js'
import util from '../utils/util.js'
import path from 'path'
import fs from 'fs'

export class FileStore extends Store {
  constructor () {
    super()
    this.rootDir = util.getUserBasePath()
  }

  getPathByKey (key) {
    return path.join(this.rootDir, key)
  }

  set (key, value) {
    const filePath = this.getPathByKey(key)
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, value)
    return filePath
  }

  get (key) {
    const filePath = this.getPathByKey(key)
    if (!fs.existsSync(filePath)) {
      return null
    }
    return fs.readFileSync(filePath)
  }
}
