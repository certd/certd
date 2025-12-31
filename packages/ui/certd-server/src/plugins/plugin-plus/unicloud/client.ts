import { UniCloudAccess } from "./access.js";
import { http, HttpClient, HttpRequestConfig, ILogger } from "@certd/basic";
import { CertInfo } from "@certd/plugin-cert";

type UniCloudClientOpts = { access: UniCloudAccess; logger: ILogger; http: HttpClient };

export class UniCloudClient {
  opts: UniCloudClientOpts;

  deviceId: string;
  xToken: string;
  token: string;
  cookie: string;

  constructor(opts: UniCloudClientOpts) {
    this.opts = opts;
    this.deviceId = new Date().getTime() + Math.floor(Math.random() * 1000000) + "";
  }

  async sign(data: any, secretKey: string) {
    const Crypto = await import("crypto-js");
    const CryptoJS = Crypto.default;
    let content = "";
    Object.keys(data)
      .sort()
      .forEach(function (key) {
        if (data[key]) {
          content = content + "&" + key + "=" + data[key];
        }
      });
    content = content.slice(1);
    return CryptoJS.HmacMD5(content, secretKey).toString();
  }
  async doRequest(req: HttpRequestConfig) {
    const res = await http.request({
      ...req,
      logRes: false,
      returnOriginRes: true,
    });
    const data = res.data;
    if (data.ret != null) {
      if (data.ret !== 0) {
        throw new Error(JSON.stringify(data));
      }
      return data.data;
    }
    if (!data.success) {
      throw new Error(JSON.stringify(data.error));
    }
    if (data.data?.errCode) {
      throw new Error(JSON.stringify(data.data));
    }
    return data.data;
  }

  async login() {
    if (this.xToken) {
      return this.xToken;
    }
    const deviceId = this.deviceId;
    const username = this.opts.access.email;
    const password = this.opts.access.password;
    function getClientInfo(appId) {
      return `{"PLATFORM":"web","OS":"windows","APPID":"${appId}","DEVICEID":"${deviceId}","scene":1001,"appId":"${appId}","appLanguage":"zh-Hans","appName":"账号中心","appVersion":"1.0.0","appVersionCode":"100","browserName":"chrome","browserVersion":"122.0.6261.95","deviceId":"174585375190823882061","deviceModel":"PC","deviceType":"pc","hostName":"chrome","hostVersion":"122.0.6261.95","osName":"windows","osVersion":"10 x64","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36","uniCompilerVersion":"4.45","uniPlatform":"web","uniRuntimeVersion":"4.45","locale":"zh-Hans","LOCALE":"zh-Hans"}`;
    }
    const clientInfo = getClientInfo("__UNI__uniid_server");
    const loginData = {
      method: "serverless.function.runtime.invoke",
      params: `{"functionTarget":"uni-id-co","functionArgs":{"method":"login","params":[{"password":"${password}","captcha":"","resetAppId":"__UNI__unicloud_console","resetUniPlatform":"web","isReturnToken":false,"email":"${username}"}],"clientInfo":${clientInfo}}}`,
      spaceId: "uni-id-server",
      timestamp: new Date().getTime(),
    };

    const secretKey = "ba461799-fde8-429f-8cc4-4b6d306e2339";
    const xSign = await this.sign(loginData, secretKey);
    const res = await this.doRequest({
      url: "https://account.dcloud.net.cn/client",
      method: "POST",
      data: loginData,
      headers: {
        "X-Serverless-Sign": xSign,
        Origin: "https://account.dcloud.net.cn",
        Referer: "https://account.dcloud.net.cn",
      },
    });

    const token = res.newToken.token;
    // const uid = res.data.uid;
    this.xToken = token;
    this.opts.logger.info("登录成功:", token);
    return token;
  }

  async getToken() {
    if (this.token) {
      return {
        token: this.token,
        cookie: this.cookie,
      };
    }
    const xToken = await this.login();

    const deviceId = this.deviceId;
    const secretKey = "4c1f7fbf-c732-42b0-ab10-4634a8bbe834";
    const clientInfo = `{"PLATFORM":"web","OS":"windows","APPID":"__UNI__unicloud_console","DEVICEID":"${deviceId}","scene":1001,"appId":"__UNI__unicloud_console","appLanguage":"zh-Hans","appName":"uniCloud控制台","appVersion":"1.0.0","appVersionCode":"100","browserName":"chrome","browserVersion":"122.0.6261.95","deviceId":"${deviceId}","deviceModel":"PC","deviceType":"pc","hostName":"chrome","hostVersion":"122.0.6261.95","osName":"windows","osVersion":"10 x64","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36","uniCompilerVersion":"4.57","uniPlatform":"web","uniRuntimeVersion":"4.57","locale":"zh-Hans","LOCALE":"zh-Hans"}`;

    const body = {
      method: "serverless.function.runtime.invoke",
      params: `{"functionTarget":"uni-cloud-kernel","functionArgs":{"action":"user/getUserToken","data":{"isLogin":true},"clientInfo":${clientInfo},"uniIdToken":"${xToken}"}}`,
      spaceId: "dc-6nfabcn6ada8d3dd",
      timestamp: new Date().getTime(),
    };

    const xSign = await this.sign(body, secretKey);
    const res = await this.doRequest({
      url: "https://unicloud.dcloud.net.cn/client",
      method: "POST",
      data: body,
      headers: {
        "X-Client-Info": encodeURIComponent(clientInfo),
        "X-Serverless-Sign": xSign,
        "X-Client-Token": xToken,
        Origin: "https://unicloud.dcloud.net.cn",
        Referer: "https://unicloud.dcloud.net.cn",
      },
    });

    const token = res.data.data.token;
    const cookies = res.headers["set-cookie"];
    let cookie = "";
    for (let i = 0; i < cookies.length; i++) {
      const item = cookies[i].substring(0, cookies[i].indexOf(";"));
      cookie += item + ";";
    }
    this.token = token;
    this.opts.logger.info("获取token成功:", token);
    this.cookie = cookie;
    return {
      token,
      cookie,
    };
  }

  async createCert(req: { spaceId: string; domain: string; provider: string; cert: CertInfo }) {
    await this.getToken();
    const { spaceId, domain, cert, provider } = req;
    this.opts.logger.info(`开始部署证书, provider:${provider},spaceId:${spaceId},domain:${domain}`);
    const crt = encodeURIComponent(cert.crt);
    const key = encodeURIComponent(cert.key);
    const body = {
      appid: "",
      provider,
      spaceId: spaceId,
      domain: domain,
      cert: crt,
      key,
    };
    const res = await this.doRequest({
      url: "https://unicloud-api.dcloud.net.cn/unicloud/api/host/create-domain-with-cert",
      method: "POST",
      data: body,
      headers: {
        Token: this.token,
        Cookie: this.cookie,
      },
    });
    this.opts.logger.info("证书部署成功：", JSON.stringify(res));
  }
}
