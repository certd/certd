import { SynologyAccess } from "./access.js";
import { HttpClient, ILogger } from "@certd/basic";
import qs from "querystring";

export type SynologyAccessToken = {
  sid: string;
  did?: string;
  synotoken: string;
};

export type SynologyRequest = {
  method?: string;
  apiParams: {
    api: string;
    version: number;
    method: string;
  };
  params?: any;
  data?: any;
  form?: any;
  headers?: any;
  useSynoToken?: boolean;
};

const device_name = "certd";

export class SynologyClient {
  access: SynologyAccess;
  http: HttpClient;
  logger: ILogger;
  skipSslVerify: boolean;

  token: SynologyAccessToken;
  constructor(access: SynologyAccess, http: HttpClient, logger: ILogger, skipSslVerify: boolean) {
    this.access = access;
    this.http = http;
    this.logger = logger;
    this.skipSslVerify = skipSslVerify;
  }

  // 登录 DSM 的函数
  async doLogin() {
    const access = this.access;
    if (access.otp && access.deviceId != null) {
      this.logger.info("OTP登录");
      return await this.doLoginWithDeviceId(access.deviceId);
    }
    this.logger.info("使用普通登录");

    const loginUrl = this.getLoginUrl();
    const res = await this.http.request({
      url: loginUrl,
      method: "GET",
      params: {
        api: "SYNO.API.Auth",
        version: 6,
        method: "login",
        account: access.username,
        passwd: access.password,
        session: "Certd",
        format: "sid",
        enable_syno_token: "yes",
      },
      skipSslVerify: this.skipSslVerify ?? true,
      timeout: this.access.timeout * 1000 || 120000,
    });

    if (!res.success) {
      throw new Error(`登录失败: `, res.error);
    }
    this.logger.info("登录成功");

    this.token = res.data as SynologyAccessToken;
    return this.token;
  }

  async doLoginWithOTPCode(otpCode: string) {
    const loginUrl = this.getLoginUrl();
    const access = this.access;
    const res = await this.http.request({
      url: loginUrl,
      method: "GET",
      params: {
        api: "SYNO.API.Auth",
        version: 6,
        method: "login",
        account: access.username,
        passwd: access.password,
        otp_code: otpCode,
        enable_device_token: "yes",
        device_name,
      },
      timeout: this.access.timeout * 1000 || 30000,
      skipSslVerify: this.skipSslVerify ?? true,
    });

    if (!res.success) {
      throw new Error(`登录失败: `, res.error);
    }
    this.logger.info("登录成功");

    this.token = res.data as SynologyAccessToken;
    return this.token;
  }

  private getLoginUrl() {
    const access = this.access;
    const loginPath = access.version === "6" ? "auth.cgi" : "entry.cgi";
    return `${access.baseUrl}/webapi/${loginPath}`;
  }

  async doLoginWithDeviceId(device_id: string) {
    const access = this.access;
    const loginUrl = this.getLoginUrl();
    const res = await this.http.request({
      url: loginUrl,
      method: "GET",
      params: {
        api: "SYNO.API.Auth",
        version: 6,
        method: "login",
        account: access.username,
        passwd: access.password,
        device_name,
        device_id,
        session: "Certd",
        format: "sid",
        enable_syno_token: "yes",
      },
      timeout: this.access.timeout * 1000 || 30000,
      skipSslVerify: this.skipSslVerify ?? true,
    });

    if (!res.success) {
      throw new Error(`登录失败: `, res.error);
    }
    this.logger.info("登录成功");

    this.token = res.data as SynologyAccessToken;
    return this.token;
  }

  async doRequest(req: SynologyRequest) {
    const sid = this.token.sid;
    const method = req.method || "POST";
    const params = {
      ...req.apiParams,
      _sid: sid, // 使用登录后获得的 session ID
      ...req.params,
      SynoToken: this.token.synotoken,
    };

    const res = await this.http.request({
      url: `${this.access.baseUrl}/webapi/entry.cgi?${qs.stringify(params)}`,
      method,
      data: req.data,
      headers: req.headers,
      skipSslVerify: this.skipSslVerify ?? true,
      timeout: this.access.timeout * 1000 || 30000,
    });
    if (!res.success) {
      throw new Error(`API 调用失败: ${JSON.stringify(res.error)}`);
    }
    return res.data;
  }

  async getCertList() {
    this.logger.info("获取证书列表");
    return await this.doRequest({
      method: "GET",
      apiParams: {
        api: "SYNO.Core.Certificate.CRT",
        version: 1,
        method: "list",
      },
    });
  }

  async getInfo() {
    this.logger.info("获取信息");
    return await this.doRequest({
      method: "GET",
      apiParams: {
        api: "SYNO.API.Info",
        version: 1,
        method: "query",
      },
    });
  }
}
