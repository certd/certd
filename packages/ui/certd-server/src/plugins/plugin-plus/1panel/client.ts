import { HttpClient, HttpRequestConfig, ILogger } from "@certd/basic";
import { OnePanelAccess } from "./access.js";

export class OnePanelClient {
  access: OnePanelAccess;
  http: HttpClient;
  logger: ILogger;
  utils: any;
  token: string;
  constructor(opts: { access: OnePanelAccess; http: HttpClient; logger: ILogger; utils: any }) {
    this.access = opts.access;
    this.http = opts.http;
    this.logger = opts.logger;
    this.utils = opts.utils;
  }

  //
  // //http://xxx:xxxx/1panel/swagger/index.html#/App/get_apps__key
  // async execute(): Promise<void> {
  //   //login 获取token
  //   /**
  //    * curl 'http://127.0.0.1:7001/api/v1/auth/login'  --data-binary '{"name":"admin_test","password":"admin_test1234","ignoreCaptcha":true,"captcha":"","captchaID":"nY8Cqeut3TjZMfJMAz0k","authMethod":"jwt","language":"zh"}' -H 'EntranceCode: emhhbmd5eg=='
  //    * curl 'http://127.0.0.1:7001/api/v1/dashboard/current/all/all' -H 'PanelAuthorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJJRCI6MCwiTmFtZSI6ImFkbWluX3Rlc3QiLCJCdWZmZXJUaW1lIjozNjAwLCJpc3MiOiIxUGFuZWwiLCJleHAiOjE3MDkyODg4MDl9.pdknJdjLY4Fp8wCE9Gvaiic2rLoSdvUSJB9ossyya_I'
  //    */
  //   const sslIds = this.sslIds;
  //   for (const sslId of sslIds) {
  //     try {
  //       const certRes = await this.get1PanelCertInfo(sslId);
  //       if (!this.isNeedUpdate(certRes)) {
  //         continue;
  //       }
  //
  //       const uploadRes = await this.doRequest({
  //         url: "/api/v1/websites/ssl/upload",
  //         method: "post",
  //         data: {
  //           sslIds,
  //           certificate: this.cert.crt,
  //           certificatePath: "",
  //           description: certRes.description || this.appendTimeSuffix("certd"),
  //           privateKey: this.cert.key,
  //           privateKeyPath: "",
  //           sslID: sslId,
  //           type: "paste",
  //         },
  //       });
  //       console.log("uploadRes", JSON.stringify(uploadRes));
  //     } catch (e) {
  //       this.logger.warn(`更新证书(id:${sslId})失败`, e);
  //       this.logger.info("可能1Panel正在重启，等待10秒后检查证书是否更新成功");
  //       await this.ctx.utils.sleep(10000);
  //       const certRes = await this.get1PanelCertInfo(sslId);
  //       if (!this.isNeedUpdate(certRes)) {
  //         continue;
  //       }
  //       throw e;
  //     }
  //   }
  // }

  async get1PanelCertInfo(sslId: string) {
    const certRes = await this.doRequest({
      url: `/api/${this.access.apiVersion}/websites/ssl/${sslId}`,
      method: "get",
    });
    if (!certRes) {
      throw new Error(`没有找到证书(id:${sslId})，请先在1Panel中手动上传证书，后续才可以自动更新`);
    }
    return certRes;
  }

  async doRequest(config: { currentNode?: string } & HttpRequestConfig<any>) {
    const tokenHeaders = await this.getAccessToken();
    config.headers = {
      ...tokenHeaders,
    };
    if (config.currentNode) {
      config.headers.CurrentNode = this.getNodeValue(config.currentNode);
      delete config.currentNode;
    }
    return await this.doRequestWithoutAuth(config);
  }

  async doRequestWithoutAuth(config: HttpRequestConfig<any>) {
    config.baseURL = this.access.baseUrl;
    config.skipSslVerify = this.access.skipSslVerify ?? false;
    config.logRes = false;
    config.logParams = false;
    const res = await this.http.request(config);
    if (config.returnOriginRes) {
      return res;
    }
    if (res.code === 200) {
      return res.data;
    }
    throw new Error(res.message);
  }

  async getCookie(name: string) {
    // https://www.docmirror.cn:20001/api/v1/auth/language
    const response = await this.doRequestWithoutAuth({
      url: `/api/${this.access.apiVersion}/auth/language`,
      method: "GET",
      returnOriginRes: true,
    });
    const cookies = response.headers["set-cookie"];
    //根据name 返回对应的cookie
    const found = cookies.find(cookie => cookie.includes(name));
    if (!found) {
      return null;
    }
    const cookie = found.split(";")[0];
    return cookie.substring(cookie.indexOf("=") + 1);
  }

  async encryptPassword(password: string) {
    const rsaPublicKeyText = await this.getCookie("panel_public_key");
    if (!rsaPublicKeyText) {
      return password;
    }
    // 使用rsa加密
    const { encryptPassword } = await import("./util.js");
    return encryptPassword(rsaPublicKeyText, password);
  }

  async getAccessToken() {
    if (this.access.type === "apikey") {
      return this.getAccessTokenByApiKey();
    } else {
      return await this.getAccessTokenByPassword();
    }
  }

  async getAccessTokenByApiKey() {
    /**
     * Token = md5('1panel' + API-Key + UnixTimestamp)
     * 组成部分：
     * 固定前缀: '1panel'
     * API-Key: 面板 API 接口密钥
     * UnixTimestamp: 当前的时间戳（秒级）
     * 请求 Header 设计¶
     * 每次请求必须携带以下两个 Header：
     *
     * Header 名称	说明
     * 1Panel-Token	自定义的 Token 值
     * 1Panel-Timestamp	当前时间戳
     * 示例请求头：¶
     *
     * curl -X GET "http://localhost:4004/api/v1/dashboard/current" \
     * -H "1Panel-Token: <1panel_token>" \
     * -H "1Panel-Timestamp: <current_unix_timestamp>"
     */

    const timestamp = Math.floor(Date.now() / 1000);
    const token = this.utils.hash.md5(`1panel${this.access.apiKey}${timestamp}`);
    return {
      "1Panel-Token": token,
      "1Panel-Timestamp": timestamp,
    };
  }

  async getAccessTokenByPassword() {
    // console.log("getAccessToken", this);
    // const tokenCacheKey = `1panel-token-${this.accessId}`;
    // let token = this.utils.cache.get(tokenCacheKey);
    // if (token) {
    //   return token;
    // }
    if (this.token) {
      return {
        PanelAuthorization: this.token,
      };
    }
    let password = this.access.password;
    password = await this.encryptPassword(password);
    const loginRes = await this.doRequestWithoutAuth({
      url: `/api/${this.access.apiVersion}/auth/login`,
      method: "post",
      headers: {
        EntranceCode: Buffer.from(this.access.safeEnter).toString("base64"),
      },
      data: {
        name: this.access.username,
        password: password,
        ignoreCaptcha: true,
        captcha: "",
        captchaID: "",
        authMethod: "jwt",
        language: "zh",
      },
    });
    this.token = loginRes.token;

    return {
      PanelAuthorization: this.token,
    };
  }

  async onGetSSLIds() {
    // if (!isPlus()) {
    //   throw new Error("自动获取站点列表为专业版功能，您可以手动输入证书id进行部署");
    // }
    const res = await this.doRequest({
      url: `/api/${this.access.apiVersion}/websites/ssl/search`,
      method: "post",
      data: {
        page: 1,
        pageSize: 99999,
      },
    });
    if (!res?.items) {
      throw new Error("没有找到证书，请先在1Panel中手动上传证书，并关联站点，后续才可以自动更新");
    }
    const options = res.items.map(item => {
      return {
        label: `${item.primaryDomain}<${item.id},${item.description || "无备注"}>`,
        value: item.id,
      };
    });
    return options;
  }

  getNodeValue(node?: string) {
    const node_master_key = "local";
    const _value = node || node_master_key;
    return encodeURIComponent(_value);
  }
}
