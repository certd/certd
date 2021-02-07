import { request } from './service'
import inputHandler from './util.input.handler'

export default {
  async list () {
    const ret = await request({
      url: '/dns-providers/list'
    })

    inputHandler.handle(ret)

    return ret
  }
}
