import crypto from "crypto";
import querystring from "querystring";
import { HttpClient, HttpRequestConfig, ILogger } from "@certd/basic";

export class KsyunClient {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
  endpoint: string;
  logger: ILogger;
  http: HttpClient;
  constructor(opts: { accessKeyId: string; secretAccessKey: string; region?: string; service: string; endpoint: string; logger: ILogger; http: HttpClient }) {
    this.accessKeyId = opts.accessKeyId;
    this.secretAccessKey = opts.secretAccessKey;
    this.region = opts.region || "cn-beijing-6";
    this.service = opts.service;
    this.endpoint = opts.endpoint;
    this.logger = opts.logger;
    this.http = opts.http;
  }

  async doRequest(opts: { action: string; version: string } & HttpRequestConfig) {
    const config = this.signRequest({
      method: opts.method || "GET",
      url: opts.url || "/2016-09-01/domain/GetCdnDomains",
      baseURL: `https://${this.endpoint}`,
      params: opts.params,
      headers: {
        "X-Action": opts.action,
        "X-Version": opts.version,
      },
      data: opts.data,
    });

    try {
      return await this.http.request({
        ...config,
        data: opts.data,
      });
    } catch (e) {
      this.logger.error(e.request);
      if (e.response?.data?.Error?.Message) {
        throw new Error(e.response?.data?.Error?.Message);
      }
      throw e;
    }
  }

  /**
   * 签名请求
   * @param {Object} config Axios 请求配置
   * @returns {Object} 签名后的请求配置
   */
  signRequest(config) {
    // 确保有必要的配置
    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error("AccessKeyId and SecretAccessKey are required");
    }

    // 设置默认值
    config.method = config.method || "GET";
    config.headers = config.headers || {};

    // 获取当前时间并设置 X-Amz-Date
    const requestDate = this.getRequestDate();
    config.headers["x-amz-date"] = requestDate;

    // 处理不同的请求方法
    let canonicalQueryString = "";
    let hashedPayload = this.hashPayload(config.data || "");

    if (config.method.toUpperCase() === "GET") {
      // GET 请求 - 参数在 URL 中
      const urlParts = config.url.split("?");
      const path = urlParts[0];
      const query = urlParts[1] || "";

      // 合并现有查询参数和额外参数
      const queryParams = {
        ...querystring.parse(query),
        ...(config.params || {}),
      };

      // 生成规范查询字符串
      canonicalQueryString = this.createCanonicalQueryString(queryParams);
      config.url = `${path}?${canonicalQueryString}`;
      config.params = {}; // 清空 params，因为已经合并到 URL 中
    } else {
      // POST/PUT 等请求 - 参数在 body 中
      canonicalQueryString = "";
      if (config.data && typeof config.data === "object") {
        // 如果 data 是对象，转换为 JSON 字符串
        config.data = JSON.stringify(config.data);
        hashedPayload = this.hashPayload(config.data);
      }
    }

    // 生成规范请求
    const canonicalRequest = this.createCanonicalRequest(config.method, config.url, canonicalQueryString, config.headers, hashedPayload);

    // 生成签名字符串
    const credentialScope = this.createCredentialScope(requestDate);
    const stringToSign = this.createStringToSign(requestDate, credentialScope, canonicalRequest);

    // 计算签名
    const signature = this.calculateSignature(requestDate, stringToSign);

    // 生成 Authorization 头
    const signedHeaders = this.getSignedHeaders(config.headers);
    const authorizationHeader = this.createAuthorizationHeader(credentialScope, signedHeaders, signature);

    // 添加 Authorization 头
    config.headers.Authorization = authorizationHeader;

    return config;
  }

  /**
   * 获取当前时间 (格式: YYYYMMDD'T'HHMMSS'Z')
   * @returns {string} 格式化后的时间字符串
   */
  getRequestDate() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    const hours = String(now.getUTCHours()).padStart(2, "0");
    const minutes = String(now.getUTCMinutes()).padStart(2, "0");
    const seconds = String(now.getUTCSeconds()).padStart(2, "0");

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * 哈希 payload
   * @param {string} payload 请求体内容
   * @returns {string} 哈希后的16进制字符串
   */
  hashPayload(payload) {
    if (typeof payload !== "string") {
      payload = "";
    }
    return crypto.createHash("sha256").update(payload).digest("hex").toLowerCase();
  }

  /**
   * 创建规范查询字符串
   * @param {Object} params 查询参数对象
   * @returns {string} 规范化的查询字符串
   */
  createCanonicalQueryString(params) {
    // 对参数名和值进行 URI 编码
    const encodedParams = {};
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        const encodedKey = this.uriEncode(key);
        const encodedValue = this.uriEncode(params[key].toString());
        encodedParams[encodedKey] = encodedValue;
      }
    }

    // 按 ASCII 顺序排序
    const sortedKeys = Object.keys(encodedParams).sort();

    // 构建查询字符串
    return sortedKeys.map(key => `${key}=${encodedParams[key]}`).join("&");
  }

  /**
   * URI 编码 (符合 AWS 规范)
   * @param {string} str 要编码的字符串
   * @returns {string} 编码后的字符串
   */
  uriEncode(str) {
    return encodeURIComponent(str).replace(/[^A-Za-z0-9\-_.~]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  }

  /**
   * 创建规范请求
   * @param {string} method HTTP 方法
   * @param {string} url 请求 URL
   * @param {string} queryString 查询字符串
   * @param {Object} headers 请求头
   * @param {string} hashedPayload 哈希后的 payload
   * @returns {string} 规范化的请求字符串
   */
  createCanonicalRequest(method, url, queryString, headers, hashedPayload) {
    // 获取规范 URI
    const urlObj = new URL(url, "http://dummy.com"); // 使用虚拟基础 URL 来解析路径
    const canonicalUri = this.uriEncodePath(urlObj.pathname) || "/";

    // 获取规范 headers 和 signed headers
    const { canonicalHeaders, signedHeaders } = this.createCanonicalHeaders(headers);

    return [method.toUpperCase(), canonicalUri, queryString, canonicalHeaders, signedHeaders, hashedPayload].join("\n");
  }

  /**
   * URI 编码路径部分
   * @param {string} path 路径
   * @returns {string} 编码后的路径
   */
  uriEncodePath(path) {
    // 分割路径为各个部分，分别编码
    return path
      .split("/")
      .map(part => this.uriEncode(part))
      .join("/");
  }

  /**
   * 创建规范 headers 和 signed headers
   * @param {Object} headers 原始请求头
   * @returns {Object} { canonicalHeaders: string, signedHeaders: string }
   */
  createCanonicalHeaders(headers) {
    // 处理 headers
    const headerMap: any = {};

    // 标准化 headers
    for (const key in headers) {
      if (headers.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        let value = headers[key];
        if (value) {
          value = value.toString().replace(/\s+/g, " ").trim();
          headerMap[lowerKey] = value;
        }
      }
    }

    // 确保 host 和 x-amz-date 存在
    if (!headerMap.host) {
      const url = headers.host || this.endpoint || "cdn.api.ksyun.com"; // 默认值
      headerMap.host = url.replace(/^https?:\/\//, "").split("/")[0];
    }

    // 按 header 名称排序
    const sortedHeaderNames = Object.keys(headerMap).sort();

    // 构建规范 headers
    let canonicalHeaders = "";
    for (const name of sortedHeaderNames) {
      canonicalHeaders += `${name}:${headerMap[name]}\n`;
    }

    // 构建 signed headers
    const signedHeaders = sortedHeaderNames.join(";");

    return { canonicalHeaders, signedHeaders };
  }

  /**
   * 获取 signed headers
   * @param {Object} headers 请求头
   * @returns {string} signed headers 字符串
   */
  getSignedHeaders(headers) {
    const { signedHeaders } = this.createCanonicalHeaders(headers);
    return signedHeaders;
  }

  /**
   * 创建信任状范围
   * @param {string} requestDate 请求日期 (YYYYMMDDTHHMMSSZ)
   * @returns {string} 信任状范围字符串
   */
  createCredentialScope(requestDate) {
    const date = requestDate.split("T")[0];
    return `${date}/${this.region}/${this.service}/aws4_request`;
  }

  /**
   * 创建签名字符串
   * @param {string} requestDate 请求日期
   * @param {string} credentialScope 信任状范围
   * @param {string} canonicalRequest 规范请求
   * @returns {string} 签名字符串
   */
  createStringToSign(requestDate, credentialScope, canonicalRequest) {
    const algorithm = "AWS4-HMAC-SHA256";
    const hashedCanonicalRequest = crypto.createHash("sha256").update(canonicalRequest).digest("hex").toLowerCase();

    return [algorithm, requestDate, credentialScope, hashedCanonicalRequest].join("\n");
  }

  /**
   * 计算签名
   * @param {string} requestDate 请求日期
   * @param {string} stringToSign 签名字符串
   * @returns {string} 签名值
   */
  calculateSignature(requestDate, stringToSign) {
    const date = requestDate.split("T")[0];
    const kDate = this.hmac(`AWS4${this.secretAccessKey}`, date);
    const kRegion = this.hmac(kDate, this.region);
    const kService = this.hmac(kRegion, this.service);
    const kSigning = this.hmac(kService, "aws4_request");

    return this.hmac(kSigning, stringToSign, "hex");
  }

  /**
   * HMAC-SHA256 计算
   * @param {string|Buffer} key 密钥
   * @param {string} data 数据
   * @param {string} [encoding] 输出编码
   * @returns {string|Buffer} HMAC 结果
   */
  hmac(key, data, encoding = null) {
    const hmac = crypto.createHmac("sha256", key);
    hmac.update(data);
    return encoding ? hmac.digest(encoding) : hmac.digest();
  }

  /**
   * 创建 Authorization 头
   * @param {string} credentialScope 信任状范围
   * @param {string} signedHeaders signed headers
   * @param {string} signature 签名值
   * @returns {string} Authorization 头值
   */
  createAuthorizationHeader(credentialScope, signedHeaders, signature) {
    return `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }
}
