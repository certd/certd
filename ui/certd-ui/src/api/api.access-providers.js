import { request } from './service'
import inputHandler from '@/api/util.input.handler'

export default {
  async list () {
    const ret = await request({
      url: '/access-providers/list'
    })

    inputHandler.handle(ret)

    return ret
  }
}
