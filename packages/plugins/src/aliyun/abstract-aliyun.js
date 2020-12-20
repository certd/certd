import { AbstractPlugin } from '../abstract-plugin/index.js'

export class AbstractAliyunPlugin extends AbstractPlugin {
  format (pem) {
    pem = pem.replace(/\r/g, '')
    pem = pem.replace(/\n\n/g, '\n')
    pem = pem.replace(/\n$/g, '')
    return pem
  }

  checkRet (ret) {
    if (ret.code != null) {
      throw new Error('执行失败：', ret.Message)
    }
  }
}
