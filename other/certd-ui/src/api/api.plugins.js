import { request } from './service'
import inputHandler from './util.input.handler'
export default {
  async list () {
    const ret = await request({
      url: '/plugins/list'
    })

    inputHandler.handle(ret)

    console.log('plugins', ret)
    return ret
  }
}
