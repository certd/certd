import { HttpClient, ILogger } from "@certd/basic";
import { CertInfo, CertReader } from "@certd/plugin-cert";
import * as crypto from "crypto";
export interface CmcdnConfig {
  tenantId: string;
  tenantKey: string;
  endpoint?: string;

  http: HttpClient;
  logger: ILogger;
}
/**
 * 移动CDN平台SDK
 */
export class CmccClient {
  private config: Required<CmcdnConfig>;
  private token: string | null = null;
  private tokenExpiresAt: number | null = null;
  private http: HttpClient;
  private logger: ILogger;

  /**
   * 构造函数
   * @param config 配置信息
   */
  constructor(config: CmcdnConfig) {
    this.config = {
      endpoint: "https://p.cdn.10086.cn/",
      ...config,
    };
    this.http = config.http;
    this.logger = config.logger;

    if (!this.config.tenantId) {
      throw new Error("tenantId is required");
    }

    if (!this.config.tenantKey) {
      throw new Error("tenantKey is required");
    }
  }

  /**
   * 生成SHA256哈希
   * @param data 输入数据
   * @returns SHA256哈希值
   */
  private sha256Hex(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * 获取当前ISO8601格式时间
   * @returns ISO8601时间字符串
   */
  private getCurrentIsoTime(): string {
    return new Date().toISOString();
  }

  /**
   * 生成认证请求签名
   * @param datetime 请求时间
   * @returns 签名
   */
  private generateAuthSign(datetime: string): string {
    const signData = `${this.config.tenantId}${datetime}${this.config.tenantKey}`;
    return this.sha256Hex(signData);
  }

  /**
   * 生成API请求签名
   * @param body 请求体
   * @param token 认证token
   * @returns 签名
   */
  private generateApiSign(body: any, token: string): string {
    const bodyStr = body ? JSON.stringify(body) : "";
    return this.sha256Hex(bodyStr + token);
  }

  /**
   * 检查token是否有效
   * @returns token是否有效
   */
  private isTokenValid(): boolean {
    if (!this.token || !this.tokenExpiresAt) {
      return false;
    }
    return Date.now() < this.tokenExpiresAt;
  }

  /**
   * 获取认证token
   * @returns 认证token
   */
  async getToken(): Promise<string> {
    // 检查是否有有效的token
    if (this.isTokenValid()) {
      return this.token!;
    }

    const datetime = this.getCurrentIsoTime();
    const sign = this.generateAuthSign(datetime);

    const authRequest = {
      datetime,
      authorization: {
        tenant_id: this.config.tenantId,
        sign,
      },
    };

    const response = await this.http.request({
      baseURL: this.config.endpoint,
      url: "/api/authentication",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: authRequest,
      skipSslVerify: true,
      logParams: false,
      logRes: false,
      logData: false,
    });

    this.token = response.token;
    // Token有效期为12小时
    this.tokenExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
    return this.token;
  }

  /**
   * 调用API
   * @param req 请求选项
   * @returns API响应
   */
  async doRequest(req: any): Promise<any> {
    // 获取有效的token
    const token = await this.getToken();

    // 设置默认headers
    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/vnd.cmcdn+json",
      "CMCDN-Auth-Token": token,
    };

    // 生成签名
    if (req.method === "POST" || req.method === "PUT") {
      const signature = this.generateApiSign(req.data, token);
      defaultHeaders["HTTP-X-CMCDN-Signature"] = signature;
    } else {
      const signature = this.sha256Hex(token);
      defaultHeaders["HTTP-X-CMCDN-Signature"] = signature;
    }

    // 合并自定义headers
    const headers = { ...defaultHeaders, ...req.headers };

    // 发送请求
    try {
      const response = await this.http.request({
        baseURL: this.config.endpoint,
        url: req.url,
        method: req.method,
        headers: headers,
        data: req.data,
        skipSslVerify: true,
        logParams: false,
        logRes: false,
        logData: false,
      });
      if (response.error_code != 0) {
        this.logger.error(`接口请求失败,${JSON.stringify(response)}`);
        throw new Error(response.error_msg || "接口请求失败");
      }

      return response.data;
    } catch (error) {
      this.logger.error(`接口请求失败,${error.response?.data?.error_msg || error.message}`);
      throw new Error(error.response?.data?.error_msg || error.message);
    }
  }
  /**
   * 清除token
   */
  clearToken(): void {
    this.token = null;
    this.tokenExpiresAt = null;
  }

  /**
   * 获取当前token
   * @returns 当前token
   */
  getCurrentToken(): string | null {
    return this.token;
  }

  /**
   * 
  域名列表查询
  本接口由 CDN 运营平台提供 ，所有外部 EC 客户使用。该接口为客户提供该客户各状态域名列表查询。本接口仅支持 JSON 结构。
  
  7.1  目录信息
  
  
  /api/domain_list?domainName =${domainName}&domainStatus =${domainStatus}
  
  
  
  7.2  请求方法
  
  GET
  
  
  
  7.3  响应状态码
  
  请求接收成功 ：201 ， body 内容详见下一节；
  授权错误 ：403；
  请求错误 ：400；
  其他 ：见 1.2.5 状态码。
  
  
  7.4  JSON 结构规范
  7.4.1 请求 URI 参数
  
  序号	父元素	元素名称	约束	类型	长度	描述
  1		domainName	?	String		域名模糊匹配过滤
  
  
  
  2		domainStatus	?	String		域名状态过滤online：启用
  offline：停用
  configuring：配置中
  configure_failed ：配置失败
  
  
  7.4.2 请求 URI 示例
  GET： http://xxx.com/api/domain_list?domainName=www.test.com&domainStatus=online
  
  
  
  7.4.3  响应数据体
  
  
  
  序号	父元	元素名称	约束	类型	长度	描述
  1		data	1	array		查询结果
  2	data	domainName	1	String		加速域名名称
  3	data	createTime	1	datetime		加速域名创建时间(2017-07-25  17:45:52)
  4	data	cname	*	String		加速域名对应的 CNAME 域名
  5	data	type	*	String		域名产品类型：
  demand:点播产品(视音频/网页、下载);
  live:直播产品
  6	data	status	*	String		域名状态：启用
  停用
  配置中
  配置失败待分发
  已生效启用中
  删除中
  
  
  7.4.4  响应报文示例
  
  
  {
  "data": [{
  "createTime": "2017-07-25 17:45:52",
  "domainName": "www.ponshine.com",
  "cname": "www.ponshine.com.cmcdn.cdn.10086.cn", "type ": "demand"
  },
  {
  "createTime": "2018-11-07 22:09:41",
  "domainName": "www.testcustom.com",
  "cname": "www.testcustom.com.cmcdn.cdn.10086.cn", "type ": "live"
  }
  ]
  }
   */
  async getDomainList(req: { domainName?: string; domainStatus?: string }) {
    const res = await this.doRequest({
      url: "/api/domain_list",
      method: "GET",
      params: {
        domainName: req.domainName,
        domainStatus: req.domainStatus,
      },
    });

    this.logger.info("getDomainList", res);

    return res.data;
  }

  /**
   * /api/config/action?commandType =saveCrt&version =1
  12.1.2 请求方法
  新增 POST
  修改 PUT
  12.1.3 响应状态码
  请求接收成功： 200/201 ， body内容详见下一节；
  授权错误 ：403；
  请求错误 ：400；
  其他 ：见1.2.5状态码。
  12.1.4 JSON 结构规范
  12.1.4.1请求数据体
  
  参数	说明	类型	约束
  
  
  
  certificate	证书 ，仅支持 PEM 格式，
  证书内的换行符使用字符串“\n”代替
  内容如需加密传输可使用
  PBEWith MD5And DES 加密 ，秘钥将私下
  提供	
  
  
  string	
  
  
  必选
  
  
  
  private_key	私钥 ，仅支持 PEM 格式，
  私钥内的换行符使用字符串“\n”代替
  内容如需加密传输可使用
  PBEWith MD5And DES 加密 ，秘钥将私下
  提供	
  
  
  string	
  
  
  必选
  
  crt_name	证书名称 ，不支持修改 ，有传 unique_id
  时不需要
  (仅支持英文字母、数字、下划线 ，最大长	
  string	
  必选
  
  
  
    度为 32 个字符)		
  
  unique_id	证书唯一 id ，修改证书时该项必选；
  修改证书时 ，如历史证书已绑定域名，
  修改后证书也需支持对应域名	
  string	
  修改必选
  contact_name	证书联系人	string	可选
  contact_mobile	证书联系人手机号	string	可选
  contact_email	证书联系人邮箱	string	可选
  
  12.1.4.2请求报文示例
   */
  async uploadCert(req: { cert: CertInfo }) {
    const certReader = new CertReader(req.cert);
    const res = await this.doRequest({
      url: "/api/config/action?commandType=saveCrt&version=1",
      method: "POST",
      data: {
        certificate: req.cert.crt,
        private_key: req.cert.key,
        crt_name: certReader.buildCertName(),
      },
    });

    this.logger.info("uploadCert", res);

    return res;
  }

  /**
   *
   * @param req
   */
  async deployCertToCdn(req: { domainNames: string[]; certId: string }) {
    // /api/config/action?commandType = manageDomainBaseConfig&version = 1
    const res = await this.doRequest({
      url: "/api/config/action?commandType=manageDomainBaseConfig&version=1",
      method: "PUT",
      data: {
        modify_type: 0,
        domains: req.domainNames,
        https_enable: true,
        unique_id: req.certId,
      },
    });
    this.logger.info("deployCertToCdn", res);

    return res.data;
  }
}
