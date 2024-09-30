import axios, { AxiosRequestConfig } from "axios";
import { logger } from "./util.log.js";
import { Logger } from "log4js";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import nodeHttp from "http";
export class HttpError extends Error {
  status?: number;
  statusText?: string;
  code?: string;
  request?: { baseURL: string; url: string; method: string; params?: any; data?: any };
  response?: { data: any };
  cause?: any;
  constructor(error: any) {
    if (!error) {
      return;
    }
    super(error.message);
    this.name = error.name;
    this.code = error.code;
    this.cause = error.cause;

    this.status = error.response?.status;
    this.statusText = error.response?.statusText;
    this.request = {
      baseURL: error.config?.baseURL,
      url: error.config?.url,
      method: error.config?.method,
      params: error.config?.params,
      data: error.config?.data,
    };
    this.response = {
      data: error.response?.data,
    };

    delete error.response;
    delete error.config;
    delete error.request;
    // logger.error(error);
  }
}

export const HttpCommonError = HttpError;
/**
 * @description 创建请求实例
 */
export function createAxiosService({ logger }: { logger: Logger }) {
  // 创建一个 axios 实例
  const service = axios.create();

  const defaultAgents = createAgent();
  // 请求拦截
  service.interceptors.request.use(
    (config: any) => {
      logger.info(`http request:${config.url}，method:${config.method}，params:${JSON.stringify(config.params)}`);
      if (config.timeout == null) {
        config.timeout = 15000;
      }
      let agents = defaultAgents;
      if (config.skipSslVerify) {
        logger.info("跳过SSL验证");
        agents = createAgent({ rejectUnauthorized: false } as any);
      }
      delete config.skipSslVerify;
      config.httpsAgent = agents.httpsAgent;
      config.httpAgent = agents.httpAgent;

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
      const status = error.response?.status;
      switch (status) {
        case 400:
          error.message = "请求错误";
          break;
        case 401:
          error.message = "未授权，请登录";
          break;
        case 403:
          error.message = "拒绝访问";
          break;
        case 404:
          error.message = `请求地址出错: ${error.response.config.url}`;
          break;
        case 408:
          error.message = "请求超时";
          break;
        case 500:
          error.message = "服务器内部错误";
          break;
        case 501:
          error.message = "服务未实现";
          break;
        case 502:
          error.message = "网关错误";
          break;
        case 503:
          error.message = "服务不可用";
          break;
        case 504:
          error.message = "网关超时";
          break;
        case 505:
          error.message = "HTTP版本不受支持";
          break;
        default:
          break;
      }
      logger.error(
        `请求出错：status:${error.response?.status},statusText:${error.response?.statusText},url:${error.config?.url},method:${error.config?.method}。`
      );
      logger.error("返回数据:", JSON.stringify(error.response?.data));
      if (error.response?.data) {
        error.message = error.response.data.message || error.response.data.msg || error.response.data.error || error.response.data;
      }
      if (error instanceof AggregateError) {
        logger.error("AggregateError", error);
      }
      const err = new HttpError(error);
      return Promise.reject(err);
    }
  );
  return service;
}

export const http = createAxiosService({ logger }) as HttpClient;
export type HttpClientResponse<R> = any;
export type HttpRequestConfig<D> = {
  skipSslVerify?: boolean;
  skipCheckRes?: boolean;
} & AxiosRequestConfig<D>;
export type HttpClient = {
  request<D = any, R = any>(config: HttpRequestConfig<D>): Promise<HttpClientResponse<R>>;
};

export function createAgent(opts: nodeHttp.AgentOptions = {}) {
  let httpAgent, httpsAgent;
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  if (httpProxy) {
    httpAgent = new HttpProxyAgent(httpProxy, opts as any);
  }
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (httpsProxy) {
    httpsAgent = new HttpsProxyAgent(httpsProxy, opts as any);
  }

  return {
    httpAgent,
    httpsAgent,
  };
}
