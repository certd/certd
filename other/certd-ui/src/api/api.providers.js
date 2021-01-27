import { request } from './service'

export default {
  list () {
    return request({
      url: '/providers/list'
    })
  }
}
