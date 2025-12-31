import { HttpClient, HttpRequestConfig, ILogger } from "@certd/basic";
import { BaiduAccess } from "./access.js";
import crypto from "crypto";
import { CertInfo } from "@certd/plugin-cert";

export type BaiduYunClientOptions = {
  access: BaiduAccess;
  logger: ILogger;
  http: HttpClient;
};
export type BaiduYunReq = {
  host: string;
  uri: string;
  body?: any;
  headers?: any;
  query?: any;
  method: string;
};
export class BaiduYunClient {
  opts: BaiduYunClientOptions;
  constructor(opts: BaiduYunClientOptions) {
    this.opts = opts;
  }

  // 调用百度云接口，传接口uri和json参数
  async doRequest(req: BaiduYunReq, config?: HttpRequestConfig) {
    const host = req.host;
    const timestamp = this.getTimestampString();
    const queryString = this.getQueryString(req.query);
    const Authorization = this.getAuthString(host, req.method, req.uri, queryString, timestamp);

    const ContentType = "application/json; charset=utf-8";

    let url = "https://" + host + req.uri;
    if (req.query) {
      url += "?" + queryString;
    }
    const res = await this.opts.http.request({
      url: url,
      method: req.method,
      data: req.body,
      headers: {
        Authorization: Authorization,
        "Content-Type": ContentType,
        Host: host,
        "x-bce-date": timestamp,
        ...req.headers,
      },
      ...config,
    });
    if (res.code) {
      throw new Error(`请求失败：${res.message}`);
    }
    return res;
  }

  // 获取UTC时间
  getTimestampString() {
    return new Date().toISOString().replace(/\.\d*/, "");
  }

  // 获取参数拼接字符串
  getQueryString(params) {
    let queryString = "";
    let paramKeyArray = [];
    if (params) {
      for (const key in params) {
        paramKeyArray.push(key);
      }
      paramKeyArray = paramKeyArray.sort();
    }
    if (paramKeyArray && paramKeyArray.length > 0) {
      for (const key of paramKeyArray) {
        queryString += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]) + "&";
      }
      queryString = queryString.substring(0, queryString.length - 1);
    }
    return queryString;
  }

  uriEncode(input: string, encodeSlash = false) {
    let result = "";

    for (let i = 0; i < input.length; i++) {
      const ch = input.charAt(i);

      if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9") || ch === "_" || ch === "-" || ch === "~" || ch === ".") {
        result += ch;
      } else if (ch === "/") {
        result += encodeSlash ? "%2F" : ch;
      } else {
        result += this.toHexUTF8(ch);
      }
    }

    return result;
  }

  toHexUTF8(ch) {
    // Convert character to UTF-8 bytes and return the hex representation
    const utf8Bytes = new TextEncoder().encode(ch);
    let hexString = "";

    for (const byte of utf8Bytes) {
      hexString += "%" + byte.toString(16).padStart(2, "0").toUpperCase();
    }

    return hexString;
  }

  // 签名
  getAuthString(Host: string, Method: string, CanonicalURI: string, CanonicalQueryString: string, timestamp: string) {
    // 1
    const expirationPeriodInSeconds = 120;
    const authStringPrefix = `bce-auth-v1/${this.opts.access.accessKey}/${timestamp}/${expirationPeriodInSeconds}`;
    // 2
    const signedHeaders = "host;x-bce-date";
    const CanonicalHeaders = encodeURIComponent("host") + ":" + encodeURIComponent(Host) + "\n" + encodeURIComponent("x-bce-date") + ":" + encodeURIComponent(timestamp);
    const CanonicalRequest = Method.toUpperCase() + "\n" + this.uriEncode(CanonicalURI, false) + "\n" + CanonicalQueryString + "\n" + CanonicalHeaders;
    // 3
    const SigningKey = crypto.createHmac("sha256", this.opts.access.secretKey).update(authStringPrefix).digest().toString("hex");
    // 4
    const Signature = crypto.createHmac("sha256", SigningKey).update(CanonicalRequest).digest().toString("hex");
    // 5
    return `${authStringPrefix}/${signedHeaders}/${Signature}`;
  }
}

export class BaiduYunCertClient {
  client: BaiduYunClient;
  constructor(opts: BaiduYunClientOptions) {
    this.client = new BaiduYunClient(opts);
  }

  async createCert(opts: { certName: string; cert: CertInfo }) {
    // 	/v1/certificate
    const res = await this.client.doRequest({
      host: "certificate.baidubce.com",
      uri: `/v1/certificate`,
      method: "post",
      body: {
        /**
         * certName	String	必须	证书的名称。长度限制为1-65个字符，以字母开头，只允许包含字母、数字、’-‘、’/’、’.’、’’，Java正则表达式` ^[a-zA-Z]a-zA-Z0-9\-/\.]{2,64}$`
         * certServerData	String	必须	服务器证书的数据内容 (Base64编码)
         * certPrivateData	String	必须	证书的私钥数据内容 (Base64编码)
         */
        certName: "certd_" + opts.certName, // 字母开头，且小于64长度
        certServerData: opts.cert.crt,
        certPrivateData: opts.cert.key,
      },
    });
    return res;
  }

  async getCertList() {
    /**
     *  GET /v1/certificate HTTP/1.1
     *     HOST: certificate.baidubce.com
     *     Authorization: {authorization}
     *     Content-Type: application/json; charset=utf-8
     *     x-bce-date: 2014-06-01T23:00:10Z
     */
    return await this.client.doRequest({
      host: "certificate.baidubce.com",
      uri: `/v1/certificate`,
      method: "get",
    });
  }

  async updateCert(opts: { certId: string; certName: string; cert: CertInfo }) {
    /**
     * /v1/certificate/{certId}?certData
     * certName	String	必须	证书的名称。长度限制为1-65个字符，以字母开头，只允许包含字母、数字、’-‘、’/’、’.’、’’，Java正则表达式` ^[a-zA-Z]a-zA-Z0-9\-/\.]{2,64}$`
     * certServerData	String	必须	服务器证书的数据内容 (Base64编码)
     * certPrivateData	String	必须	证书的私钥数据内容 (Base64编码)
     * certLinkData	String	可选	证书链数据内容 (Base64编码)
     * certType	Integer	可选	证书类型，非必填，默认为1
     */

    return await this.client.doRequest({
      host: "certificate.baidubce.com",
      uri: `/v1/certificate/${opts.certId}`,
      method: "put",
      body: {
        certName: opts.certName,
        certServerData: opts.cert.crt,
        certPrivateData: opts.cert.key,
      },
    });
  }
}
