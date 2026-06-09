import { HttpClient, HttpRequestConfig, ILogger } from "@certd/basic";
import { FlexCDNAccess } from "./access.js";

export class FlexCDNClient {
  http: HttpClient;
  logger: ILogger;
  access: FlexCDNAccess;
  token: string;

  constructor(opts: { logger: ILogger; http: HttpClient; access: FlexCDNAccess }) {
    this.logger = opts.logger;
    this.http = opts.http;
    this.access = opts.access;
  }

  async getToken() {
    /*
    步骤2：调用API获取AccessToken
接口地址
/APIAccessTokenService/getAPIAccessToken
请求方法
POST。

请求参数
{
    "type": "admin",
    "accessKeyId": "zr9cmR42AEZxRyIV",
    "accessKey": "2w5p5NSZZuplUPsfPMzM7dFmTrI7xyja"
}
其中
type - 如果是用户（即平台用户）AccessKey，则值为 user；如果是管理员（即系统用户）AccessKey，则值为 admin；
accessKeyId 和 accessKey 换成你在步骤1中创建的AccessKey对应的数据。
响应结果
{
   "code": 200,
   "data": {
      "token": "IKNSMufZ1vDiXp5rSd9QR01m1174Oum5sah4amWFgbRb7lOKjuk62Spl7hgcazctzGhGG7jPgfmYUPojulC0FK5cLbrj8n7kxW7BtSawH9gWW14IWOzBY6UcpyXQndFu",
      "expiresAt": 1609686945
   },
   "message": "ok"
}
     */

    const res = await this.doRequest({
      url: "/APIAccessTokenService/getAPIAccessToken",
      method: "POST",
      data: {
        type: this.access.type,
        accessKeyId: this.access.accessKeyId,
        accessKey: this.access.accessKey,
      },
    });
    this.token = res.token;
    return this.token;
  }

  async doRequest(req: HttpRequestConfig) {
    const headers = {
      ...req.headers,
    };
    if (this.token) {
      headers["X-Cloud-Access-Token"] = this.token;
    }
    const res = await this.http.request({
      ...req,
      headers,
      baseURL: this.access.endpoint,
      logRes: false,
      logParams: false,
      skipSslVerify: true,
    });
    if (res.code === 200) {
      return res.data;
    } else {
      throw new Error(res.message);
    }
  }
}
