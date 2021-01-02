import { AbstractPlugin } from '../abstract-plugin/index.js'

export class AbstractTencentPlugin extends AbstractPlugin {
  checkRet (ret) {
    if (!ret || ret.Error) {
      throw new Error('执行失败：' + ret.Error.Code + ',' + ret.Error.Message)
    }
  }

  getSafetyDomain (domain) {
    return domain.replace(/\*/g, '_')
  }
}
