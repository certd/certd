import { request } from './service'

export default {
  list () {
    return request({
      url: '/plugins/list'
    })
  }
}
