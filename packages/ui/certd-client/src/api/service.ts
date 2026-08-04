import axios from "axios";
import { get } from "lodash-es";
import { errorLog, errorCreate } from "./tools";
import { env } from "/src/utils/util.env";
import { useUserStore } from "/@/store/user";
import { useProjectStore } from "../store/project";

export class CodeError extends Error {
  code: number;
  data?: any;
  constructor(message: string, code: number, data?: any) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

/**
 * @description 创建请求实例
 */
function createService() {
  // 创建一个 axios 实例
  const service = axios.create();
  // 请求拦截
  service.interceptors.request.use(
    config => config,
    error => {
      // 发送失败
      console.log(error);
      return Promise.reject(error);
    }
  );
  // 响应拦截
  service.interceptors.response.use(
    response => {
      if (response.config.responseType === "blob") {
        return response;
      }
      //@ts-ignore
      if (response.config.returnOriginRes) {
        return response;
      }
      // dataAxios 是 axios 返回数据中的 data
      const dataAxios = response.data;

      // @ts-ignore
      if (response.config.unpack === false) {
        //如果不需要解包
        return dataAxios;
      }
      //@ts-ignore
      const showErrorNotify = response?.config?.showErrorNotify;
      // 这个状态码是和后端约定的
      if (dataAxios?.code === undefined) {
        // 如果没有 code 代表这不是项目后端开发的接口
        errorCreate(`Non-standard response: ${dataAxios}, ${response.config.url}`, showErrorNotify);
        return dataAxios;
      }
      const { code } = dataAxios;
      // 有 code 代表这是一个后端接口 可以进行进一步的判断
      switch (code) {
        case 0:
          // [ 示例 ] code === 0 代表没有错误
          // @ts-ignore
          return dataAxios?.data;
        default:
          // 不是正确的 code
          const errorMessage = dataAxios.msg || dataAxios.message || "Unknown error";
          // @ts-ignore
          if (response?.config?.onError) {
            const err = new CodeError(errorMessage, dataAxios.code, dataAxios.data);
            // @ts-ignore
            response.config.onError(err);
          }
          errorCreate(`${errorMessage} (request: ${response.config.url})`, showErrorNotify, dataAxios);
      }
    },
    error => {
      const status = get(error, "response.status");
      switch (status) {
        case 400:
          error.message = "Bad request";
          break;
        case 401:
          error.message = "Unauthorized, please log in";
          break;
        case 403:
          error.message = "Access denied";
          break;
        case 404:
          error.message = `Request URL error`;
          break;
        case 408:
          error.message = "Request timed out";
          break;
        case 500:
          error.message = "Internal server error";
          break;
        case 501:
          error.message = "Service not implemented";
          break;
        case 502:
          error.message = "Gateway error";
          break;
        case 503:
          error.message = "Service unavailable";
          break;
        case 504:
          error.message = "Gateway timeout";
          break;
        case 505:
          error.message = "HTTP version not supported";
          break;
        default:
          break;
      }
      error.message += ` (request: ${error.response?.config?.url})`;
      errorLog(error, error?.response?.config?.showErrorNotify);
      if (status === 401) {
        const userStore = useUserStore();
        userStore.logout(true, true);
      }

      if (error?.config?.onError) {
        error.config.onError(error);
      }
      return Promise.reject(error);
    }
  );
  return service;
}

/**
 * @description 创建请求方法
 * @param {Object} service axios 实例
 */
function createRequestFunction(service: any) {
  return function (config: any) {
    const configDefault: any = {
      headers: {
        "Content-Type": get(config, "headers.Content-Type", "application/json"),
      } as any,
      timeout: 30000,
      baseURL: env.API,
      data: {},
      params: {},
    };
    const projectStore = useProjectStore();

    const userStore = useUserStore();
    const token = userStore.getToken;
    if (token != null) {
      // @ts-ignore
      configDefault.headers.Authorization = token;
    }
    Object.assign(configDefault, config);

    if (!configDefault.params.projectId && projectStore.isEnterprise && !config.url.startsWith("/sys") && !config.url.startsWith("http")) {
      configDefault.params.projectId = projectStore.currentProject?.id;
    }
    return service(configDefault);
  };
}

// 用于真实网络请求的实例和请求方法
export const service = createService();
export const request = createRequestFunction(service);
