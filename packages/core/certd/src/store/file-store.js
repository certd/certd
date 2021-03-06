import { Store, util } from '@certd/api'
import path from 'path'
import fs from 'fs'
const logger = util.logger
export class FileStore extends Store {
  constructor (opts) {
    super()
    if (opts.rootDir != null) {
      this.rootDir = opts.rootDir
    } else {
      this.rootDir = util.path.getUserBasePath()
    }
    if (opts.test) {
      this.rootDir = path.join(this.rootDir, '/test/')
    }
  }

  getActualKey (key) {
    // return 前缀+key
    return this.getPathByKey(key)
  }

  buildKey (...keyItem) {
    return path.join(...keyItem)
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
    return fs.readFileSync(filePath).toString()
  }

  link (targetPath, linkPath) {
    targetPath = this.getPathByKey(targetPath)
    linkPath = this.getPathByKey(linkPath)
    if (fs.existsSync(linkPath)) {
      try {
        fs.unlinkSync(linkPath)
      } catch (e) {
        logger.error('unlink error:', e)
      }
    }
    fs.symlinkSync(targetPath, linkPath, 'dir')
  }

  unlink (linkPath) {
    linkPath = this.getPathByKey(linkPath)
    fs.unlinkSync(linkPath)
  }
}
