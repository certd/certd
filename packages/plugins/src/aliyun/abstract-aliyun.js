import { AbstractPlugin } from '../abstract-plugin.js'

export class AbstractAliyunPlugin extends AbstractPlugin {
  format (pem) {
    pem = pem.replace(/\r/g, '')
    pem = pem.replace(/\n\n/g, '')
    pem = pem.replace(/\n$/g, '')
    return pem
  }

  getAccessProvider (accessProvider, accessProviders) {
    if (typeof accessProvider === 'string' && accessProviders) {
      accessProvider = accessProviders[accessProvider]
    }
    return accessProvider
  }

  checkRet (ret) {
    if (ret.code != null) {
      throw new Error('执行失败：', ret.Message)
    }
  }
}
