import axios from 'axios'
import qs from 'qs'
import logger from './util.log.js'
/**
 * @description 创建请求实例
 */
function createService () {
  // 创建一个 axios 实例
  const service = axios.create()
  // 请求拦截
  service.interceptors.request.use(
    config => {
      if (config.formData) {
        config.data = qs.stringify(config.formData, {
          arrayFormat: 'indices',
          allowDots: true
        }) // 序列化请求参数
        delete config.formData
      }
      return config
    },
    error => {
      // 发送失败
      logger.error(error)
      return Promise.reject(error)
    }
  )
  // 响应拦截
  service.interceptors.response.use(
    response => {
      logger.info('http response:', JSON.stringify(response.data))
      return response.data
    },
    error => {
      // const status = _.get(error, 'response.status')
      // switch (status) {
      //   case 400: error.message = '请求错误'; break
      //   case 401: error.message = '未授权，请登录'; break
      //   case 403: error.message = '拒绝访问'; break
      //   case 404: error.message = `请求地址出错: ${error.response.config.url}`; break
      //   case 408: error.message = '请求超时'; break
      //   case 500: error.message = '服务器内部错误'; break
      //   case 501: error.message = '服务未实现'; break
      //   case 502: error.message = '网关错误'; break
      //   case 503: error.message = '服务不可用'; break
      //   case 504: error.message = '网关超时'; break
      //   case 505: error.message = 'HTTP版本不受支持'; break
      //   default: break
      // }
      logger.error('请求出错：', error.response.config.url, error)
      return Promise.reject(error)
    }
  )
  return service
}

export const request = createService()
