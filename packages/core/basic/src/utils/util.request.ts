import axios, { AxiosHeaders, AxiosRequestConfig } from "axios";
import { ILogger, logger } from "./util.log.js";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import nodeHttp from "http";
import * as https from "node:https";
import { merge } from "lodash-es";
import { safePromise } from "./util.promise.js";
import fs from "fs";
import sleep from "./util.sleep.js";
const errorMap: Record<string, string> = {
  "ssl3_get_record:wrong version number": "http协议错误，服务端要求http协议，请检查是否使用了https请求",
  "getaddrinfo EAI_AGAIN": "无法解析域名，请检查网络连接或dns配置，更换docker-compose.yaml中dns配置",
  "self-signed certificate": "目标站点为自签名证书，请勾选忽略证书校验",
};

export class HttpError extends Error {
  status?: number;
  statusText?: string;
  code?: string;
  request?: { baseURL: string; url: string; method: string; params?: any; data?: any };
  response?: { data: any; headers: AxiosHeaders };
  cause?: any;
  constructor(error: any) {
    if (!error) {
      return;
    }

    let message = error?.message || error?.response.statusText || error?.code;
    if (message && typeof message === "string" && message.indexOf) {
      for (const key in errorMap) {
        if (message.indexOf(key) > -1) {
          message = `${message}(${errorMap[key]})`;
          break;
        }
      }
    }
    if (!message) {
      message = error.message;
    }
    if (error.errors && error.errors.length > 0) {
      message += " \n" + error.errors.map((item: any) => item.message).join("\n ");
    }
    super(message);

    this.name = error.name;
    this.code = error.code;

    this.status = error.response?.status;
    this.statusText = error.response?.statusText || error.code;

    this.request = {
      baseURL: error.config?.baseURL,
      url: error.config?.url,
      method: error.config?.method,
      params: error.config?.params,
      data: error.config?.data,
    };
    let url = error.config?.url;
    if (error.config?.baseURL) {
      url = (error.config?.baseURL || "") + url;
    }
    if (url) {
      this.message = `${this.message} 【${url}】`;
    }

    this.response = {
      data: error.response?.data,
      headers: error.response?.headers,
    };

    const { stack, cause } = error;
    this.cause = cause;
    this.stack = stack;
    delete error.response;
    delete error.config;
    delete error.request;
    // logger.error(error);
  }
}

export const HttpCommonError = HttpError;

let defaultAgents = createAgent();

export function setGlobalProxy(opts: { httpProxy?: string; httpsProxy?: string }) {
  logger.info("setGlobalProxy:", opts);
  defaultAgents = createAgent(opts);
}

export function getGlobalAgents() {
  return defaultAgents;
}

/**
 * @description 创建请求实例
 */
export function createAxiosService({ logger }: { logger: ILogger }) {
  // 创建一个 axios 实例
  const service = axios.create();

  // 请求拦截
  service.interceptors.request.use(
    (config: any) => {
      if (config.logParams == null) {
        config.logParams = false;
      }
      if (config.logRes == null) {
        config.logRes = false;
      }
      if (config.logData == null) {
        config.logData = false;
      }

      logger.info(`http request:${config.url}，method:${config.method}`);
      if (config.logParams !== false && config.params) {
        logger.info(`params:${JSON.stringify(config.params)}`);
      }
      if (config.logData !== false && config.data) {
        logger.info(`data:${JSON.stringify(config.data)}`);
      }
      if (config.timeout == null) {
        config.timeout = 15000;
      }
      let agents = defaultAgents;
      if (config.skipSslVerify || config.httpProxy) {
        let rejectUnauthorized = true;
        if (config.skipSslVerify) {
          logger.info("跳过SSL验证");
          rejectUnauthorized = false;
        }
        const proxy: any = {};
        if (config.httpProxy) {
          logger.info("使用自定义http代理:", config.httpProxy);
          proxy.httpProxy = config.httpProxy;
          proxy.httpsProxy = config.httpProxy;
        }

        agents = createAgent({ rejectUnauthorized, ...proxy } as any);
      }

      delete config.skipSslVerify;
      config.httpsAgent = agents.httpsAgent;
      config.httpAgent = agents.httpAgent;

      // const agent = new https.Agent({
      //   rejectUnauthorized: false  // 允许自签名证书
      // });
      // config.httpsAgent = agent;
      config.proxy = false; //必须 否则还会走一层代理，

      config.retry = merge(
        {
          status: [421],
          count: 0,
          max: 3,
          delay: 1000,
        },
        config.retry
      );
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
      if (response?.config?.logRes !== false) {
        let resData = response?.data;
        try {
          resData = JSON.stringify(response?.data);
        } catch (e) {}

        logger.info(`http response : status=${response?.status},data=${resData}`);
      } else {
        logger.info("http response status:", response?.status);
      }

      if (response?.config?.returnOriginRes) {
        return response;
      }
      return response.data;
    },
    async (error: any) => {
      const status = error.response?.status;
      let message = "";
      switch (status) {
        case 400:
          message = "请求错误";
          break;
        case 401:
          message = "认证/登录失败";
          break;
        case 403:
          message = "拒绝访问";
          break;
        case 404:
          message = `请求地址出错`;
          break;
        case 408:
          message = "请求超时";
          break;
        case 500:
          message = "服务器内部错误";
          break;
        case 501:
          message = "服务未实现";
          break;
        case 502:
          message = "网关错误";
          break;
        case 503:
          message = "服务不可用";
          break;
        case 504:
          message = "网关超时";
          break;
        case 505:
          message = "HTTP版本不受支持";
          break;
        case 302:
          //重定向
          return Promise.resolve(error.response);
        case 421:
          message = "源站请求超时";
          break;
        default:
          break;
      }
      if (status) {
        message += ` [${status}] `;
      }

      const errorCode = error.code;
      let errorMessage = "";
      if (errorCode === "ECONNABORTED") {
        errorMessage = "请求连接终止";
      } else if (errorCode === "ETIMEDOUT") {
        errorMessage = "请求连接超时";
      } else if (errorCode === "ECONNRESET") {
        errorMessage = "请求连接被重置";
      } else if (errorCode === "ECONNREFUSED") {
        errorMessage = "请求连接被服务端拒绝";
      } else if (errorCode === "ENOTFOUND") {
        errorMessage = "请求地址不存在";
      }
      if (errorCode) {
        errorMessage += ` [${errorCode}] `;
      }
      if (message) {
        errorMessage += `,${message}`;
      }
      if (error.message) {
        errorMessage += `(${error.message})`;
      }
      error.message = errorMessage;
      logger.error(`请求出错：${errorMessage} status:${status},statusText:${error.response?.statusText || error.code},url:${error.config?.url},method:${error.config?.method}。`);
      logger.error("返回数据:", JSON.stringify(error.response?.data));
      if (error.response?.data) {
        const message = error.response.data.message || error.response.data.msg || error.response.data.error;
        if (typeof message === "string") {
          error.message = message;
        }
      }
      if (error instanceof AggregateError) {
        logger.error("AggregateError", error);
      }

      const originalRequest = error.config || {};
      // logger.info(`config`, originalRequest);
      const retry = originalRequest.retry || {};
      if (retry.status && retry.status.includes(status)) {
        if (retry.max > 0 && retry.count < retry.max) {
          // 重试次数增加
          retry.count++;
          const delay = retry.delay * retry.count;
          logger.error(`status=${status}，重试次数${retry.count},将在${delay}ms后重试，请求地址：${originalRequest.url}`);
          await sleep(delay);
          return service.request(originalRequest); // 重试请求
        }
        logger.error(`重试超过最大次数${retry.max}，请求失败:${originalRequest.url}`);
      }

      const err = new HttpError(error);
      if (error.response?.config?.logParams === false) {
        delete err.request?.params;
        delete err.request?.data;
      }
      return Promise.reject(err);
    }
  );
  return service;
}

export const http = createAxiosService({ logger }) as HttpClient;
export type HttpClientResponse<R> = any;
export type HttpRequestConfig<D = any> = {
  skipSslVerify?: boolean;
  skipCheckRes?: boolean;
  logParams?: boolean;
  logRes?: boolean;
  logData?: boolean;
  httpProxy?: string;
  returnOriginRes?: boolean;
} & AxiosRequestConfig<D>;
export type HttpClient = {
  request<D = any, R = any>(config: HttpRequestConfig<D>): Promise<HttpClientResponse<R>>;
};

// const http_proxy_backup = process.env.HTTP_PROXY || process.env.http_proxy;
// const https_proxy_backup = process.env.HTTPS_PROXY || process.env.https_proxy;

export type CreateAgentOptions = {
  httpProxy?: string;
  httpsProxy?: string;
} & nodeHttp.AgentOptions;
export function createAgent(opts: CreateAgentOptions = {}) {
  opts = merge(
    {
      autoSelectFamily: true,
      autoSelectFamilyAttemptTimeout: 1000,
      connectTimeout: 5000, // 连接建立超时
    },
    opts
  );

  let httpAgent, httpsAgent;
  const httpProxy = opts.httpProxy;
  if (httpProxy) {
    process.env.HTTP_PROXY = httpProxy;
    process.env.http_proxy = httpProxy;
    logger.info("use httpProxy:", httpProxy);
    httpAgent = new HttpProxyAgent(httpProxy, opts as any);
    merge(httpAgent.options, opts);
  } else {
    process.env.HTTP_PROXY = "";
    process.env.http_proxy = "";
    httpAgent = new nodeHttp.Agent(opts);
  }
  const httpsProxy = opts.httpsProxy;
  if (httpsProxy) {
    process.env.HTTPS_PROXY = httpsProxy;
    process.env.https_proxy = httpsProxy;
    logger.info("use httpsProxy:", httpsProxy);
    httpsAgent = new HttpsProxyAgent(httpsProxy, opts as any);
    merge(httpsAgent.options, opts);
  } else {
    process.env.HTTPS_PROXY = "";
    process.env.https_proxy = "";
    httpsAgent = new https.Agent(opts);
  }
  return {
    httpAgent,
    httpsAgent,
  };
}

export async function download(req: { http: HttpClient; config: HttpRequestConfig; savePath: string; logger: ILogger }) {
  const { http, config, savePath, logger } = req;
  return safePromise((resolve, reject) => {
    http
      .request({
        logRes: false,
        responseType: "stream",
        ...config,
      })
      .then(res => {
        const writer = fs.createWriteStream(savePath);
        res.pipe(writer);
        writer.on("close", () => {
          logger.info("文件下载成功");
          resolve(true);
        });
        //error
        writer.on("error", err => {
          logger.error("下载失败", err);
          reject(err);
        });
        //进度条打印
        const totalLength = res.headers["content-length"];
        let currentLength = 0;
        // 每5%打印一次
        const step = (totalLength / 100) * 5;
        res.on("data", (chunk: any) => {
          currentLength += chunk.length;
          if (currentLength % step < chunk.length) {
            const percent = ((currentLength / totalLength) * 100).toFixed(2);
            logger.info(`下载进度：${percent}%`);
          }
        });
      })
      .catch(err => {
        logger.info("下载失败", err);
        reject(err);
      });
  });
}

export function getCookie(response: any, name: string) {
  const cookies = response.headers["set-cookie"];
  //根据name 返回对应的cookie
  const found = cookies.find((cookie: any) => cookie.includes(name));
  if (!found) {
    return null;
  }
  const cookie = found.split(";")[0];
  return cookie.substring(cookie.indexOf("=") + 1);
}
