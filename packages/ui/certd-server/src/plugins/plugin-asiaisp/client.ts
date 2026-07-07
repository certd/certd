import { HttpClient, ILogger } from "@certd/basic";
import { CertInfo, CertReader } from "@certd/plugin-cert";
import * as crypto from "crypto";

const BASE_URL = "https://api.asia-isp.com";
const URI = "/openapi/v3/stat";

export interface AsiaIspConfig {
  accessKeyId: string;
  accessKeySecret: string;
  http: HttpClient;
  logger: ILogger;
}

export interface AsiaIspDomain {
  domain: string;
  serviceType: string;
  scope: string;
  protocol: string;
  certId: number;
  cname: string;
  originHost: string;
  originAddr: string;
  originProtocol: string;
  originType: string;
  domainStatus: number;
  operatingStatus: number;
}

/**
 * 橙域网络(asia-isp) CDN API 客户端
 * 签名算法参照 Python 参考实现：
 *   message = accessKeySecret={sk}&[body={json}]&method={method}&nonce={nonce}&queryString={qs}&timestamp={ts}&uri={uri}
 *   signature = URL-safe-Base64(HMAC-SHA1(sk, message))
 */
export class AsiaIspClient {
  private config: AsiaIspConfig;
  private http: HttpClient;
  private logger: ILogger;

  constructor(config: AsiaIspConfig) {
    this.config = config;
    this.http = config.http;
    this.logger = config.logger;

    if (!this.config.accessKeyId) {
      throw new Error("accessKeyId 不能为空");
    }
    if (!this.config.accessKeySecret) {
      throw new Error("accessKeySecret 不能为空");
    }
  }

  /**
   * 生成 HMAC-SHA1 签名，结果做 URL-safe Base64（替换 + → -，/ → _）
   */
  private buildSignature(opts: { body?: any; method: string; nonce: string; queryString: string; timestamp: string }): string {
    const { body, method, nonce, queryString, timestamp } = opts;
    const sk = this.config.accessKeySecret;

    const pieces: string[] = [`accessKeySecret=${sk}`];

    // body 仅在 POST/PUT 时存在，对应 Python 的 body is not None
    if (body !== undefined && body !== null) {
      pieces.push(`body=${JSON.stringify(body)}`);
    }

    pieces.push(`method=${method}`, `nonce=${nonce}`, `queryString=${queryString}`, `timestamp=${timestamp}`, `uri=${URI}`);

    const message = pieces.join("&");
    const hmac = crypto.createHmac("sha1", sk).update(message).digest("base64");
    // URL-safe Base64
    return hmac.replace(/\+/g, "-").replace(/\//g, "_");
  }

  /**
   * 通用 API 请求（完全对齐 Python 实现）
   */
  async doRequest(req: { method: string; action: string; data?: any }): Promise<any> {
    const { method, action, data } = req;
    const nonce = String(Math.floor(Math.random() * 90000000) + 10000000);
    const timestamp = Date.now().toString();
    const queryString = `action=${action}`;

    const signature = this.buildSignature({
      body: method === "POST" || method === "PUT" ? data : undefined,
      method,
      nonce,
      queryString,
      timestamp,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      accessKeyId: this.config.accessKeyId,
      nonce,
      timestamp,
      signature,
    };

    const url = `${BASE_URL}${URI}?${queryString}`;

    try {
      const response = await this.http.request({
        url,
        method,
        headers,
        data: method === "POST" || method === "PUT" ? data : undefined,
        skipSslVerify: true,
        logParams: false,
        logRes: false,
        logData: false,
      });

      if (response.code !== "0") {
        this.logger.error(`接口请求失败: code=${response.code}, msg=${response.msg}`);
        throw new Error(response.msg || "接口请求失败");
      }

      return response;
    } catch (error: any) {
      if (error.message && !error.message.includes("接口请求失败")) {
        this.logger.error(`接口请求异常: ${error.message}`);
        throw new Error(`接口请求异常: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取域名列表
   * GET /openapi/v3/stat?action=domainQueryList
   */
  async getDomainList(): Promise<AsiaIspDomain[]> {
    const res = await this.doRequest({
      method: "GET",
      action: "domainQueryList",
    });
    const list = res.data || [];
    this.logger.info(`获取域名列表成功，共 ${list.length} 个域名`);
    return list;
  }

  /**
   * 获取证书列表
   * GET /openapi/v3/stat?action=certificateQueryList
   */
  async getCertList(): Promise<Array<{ certId: string; name: string }>> {
    const res = await this.doRequest({
      method: "GET",
      action: "certificateQueryList",
    });
    return res.data || [];
  }

  /**
   * 查询证书详情
   * GET /openapi/v3/stat?action=certificateQuery&certId=xxx
   */
  async getCertDetail(certId: number): Promise<any> {
    const res = await this.doRequest({
      method: "GET",
      action: `certificateQuery&certId=${certId}`,
    });
    return res.data;
  }

  /**
   * 上传证书
   * POST /openapi/v3/stat?action=certificateUpload
   * 返回证书ID
   */
  async uploadCert(req: { cert: CertInfo; name?: string }): Promise<number> {
    const certReader = new CertReader(req.cert);
    const certName = req.name || certReader.buildCertName("", true);

    try {
      const res = await this.doRequest({
        method: "POST",
        action: "certificateUpload",
        data: {
          name: certName,
          publicKey: req.cert.crt,
          privateKey: req.cert.key,
        },
      });
      const certId = res.data;
      this.logger.info(`上传证书成功，证书ID: ${certId}`);
      return certId;
    } catch (e: any) {
      const msg = e.message || "";
      const isExists = msg.includes("Certificate already exists") || e.code === "80003" || msg.includes("Certificate note name already exists") || e.code === "80010";
      //返回数据: {"code":"80010","msg":"Certificate note name already exists","data":null}
      if (!isExists) {
        throw e;
      }

      this.logger.info(`证书已存在，按名称查找: ${certName}`);
      const list = await this.getCertList();
      const found = list.find((item: any) => item.name === certName);
      if (!found) {
        throw new Error(`证书已存在但无法查询到: 请重新申请一份证书，或者将已有证书名称修改为：${certName}`);
      }
      const certId = Number(found.certId);
      this.logger.info(`复用已有证书，证书ID: ${certId}`);
      return certId;
    }
  }

  /**
   * 删除证书
   * DELETE /openapi/v3/stat?action=certificateDelete&certId=xxx
   */
  async deleteCert(certId: number): Promise<void> {
    await this.doRequest({
      method: "DELETE",
      action: `certificateDelete&certId=${certId}`,
    });
    this.logger.info(`删除证书成功，证书ID: ${certId}`);
  }

  /**
   * 部署证书到 CDN 域名（修改域名配置，绑定证书）
   * PUT /openapi/v3/stat?action=domainModify
   */
  async deployCertToDomain(req: { domain: string; certId: number; protocol: string }): Promise<void> {
    await this.doRequest({
      method: "PUT",
      action: "domainModify",
      data: {
        domain: req.domain,
        certId: `${req.certId}`,
        protocol: req.protocol || "https",
      },
    });
    this.logger.info(`部署证书到域名成功: ${req.domain}, certId=${req.certId}`);
  }
}
