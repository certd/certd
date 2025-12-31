import crypto from "node:crypto";
import { BaotaAccess } from "../access.js";
import { HttpClient, HttpRequestConfig } from "@certd/basic";
import * as querystring from "node:querystring";

export class BaotaClient {
  access: BaotaAccess;
  http: HttpClient;

  constructor(access: BaotaAccess, http: HttpClient) {
    this.access = access;
    this.http = http;
  }

  //将以上 java代码 翻译成nodejs 代码
  getRequestToken() {
    const timestamps = Math.floor(new Date().getTime() / 1000);
    const md5Sign = this.getMd5(this.access.apiSecret);
    const temp = timestamps + md5Sign;
    return {
      request_token: this.getMd5(temp),
      request_time: "" + timestamps,
    };
  }

  getMd5(content: string) {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  async doRequest(path: string, action: string, data: any = {}, options?: HttpRequestConfig<any>) {
    const token = this.getRequestToken();
    const body = {
      ...token,
      ...data,
    };
    const bodyStr = querystring.stringify(body);
    // const agent = new https.Agent({
    //   rejectUnauthorized: false,
    // });
    let panelUrl = this.access.panelUrl;
    if (panelUrl.endsWith("/")) {
      panelUrl = panelUrl.substring(0, panelUrl.length - 1);
    }
    let url = `${panelUrl}${path}`;
    if (action) {
      url = `${url}?action=${action}`;
    }
    const res: any = await this.http.request({
      url: url,
      method: "post",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: bodyStr,
      // httpsAgent: agent,
      ...options,
      skipSslVerify: this.access.skipSslVerify ?? true,
    });
    if (!options?.skipCheckRes && res.status === false) {
      throw new Error(res.msg);
    }
    return res;
  }

  async doWindowsRequest(path: string, data: any, options?: HttpRequestConfig<any>) {
    const token = this.getRequestToken();
    const body = {
      ...token,
      ...data,
    };
    // const agent = new https.Agent({
    //   rejectUnauthorized: false,
    // });
    const url = `${this.access.panelUrl}${path}`;
    const res: any = await this.http.request({
      url: url,
      method: "post",
      data: body,
      // httpsAgent: agent,
      ...options,
      skipSslVerify: this.access.skipSslVerify ?? true,
    });
    if (!options?.skipCheckRes && res.status === false) {
      throw new Error(res.msg);
    }
    return res;
  }
}
