import axios from "axios";
// @ts-ignore
import qs from "qs";
import { logger } from "./util.log.js";
import { Logger } from "log4js";
/**
 * @description 创建请求实例
 */
export function createAxiosService({ logger }: { logger: Logger }) {
  // 创建一个 axios 实例
  const service = axios.create();
  // 请求拦截
  service.interceptors.request.use(
    (config: any) => {
      if (config.formData) {
        config.data = qs.stringify(config.formData, {
          arrayFormat: "indices",
          allowDots: true,
        }); // 序列化请求参数
        delete config.formData;
      }
      logger.info(`http request:${config.url}，method:${config.method}`);
      return config;
    },
    (error: Error) => {
      // 发送失败
      logger.error("接口请求失败：", error);
      return Promise.reject(error);
    }
  );
  // 响应拦截
  service.interceptors.response.use(
    (response: any) => {
      logger.info("http response:", JSON.stringify(response?.data));
      return response.data;
    },
    (error: any) => {
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
      logger.error(`请求出错：url:${error?.response?.config.url},method:${error?.response?.config?.method},status:${error?.response?.status}`);
      logger.info("返回数据:", JSON.stringify(error?.response?.data));
      delete error.config;
      const data = error?.response?.data;
      if (!data) {
        error.message = data.message || data.msg || data.error || data;
      }
      if (error?.response) {
        return Promise.reject({
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          request: {
            url: error?.response?.config?.url,
            method: error?.response?.config?.method,
            data: error?.response?.data,
          },
          data: error?.response?.data,
        });
      }
      return Promise.reject(error);
    }
  );
  return service;
}

export const request = createAxiosService({ logger });
