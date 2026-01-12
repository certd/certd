import { UpyunAccess } from "./access.js";
import { HttpClient, ILogger } from "@certd/basic";
import { CertInfo } from "@certd/plugin-cert";

export type UpyunClientOptions = {
  access: UpyunAccess
  logger: ILogger;
  http: HttpClient
}

export class UpyunClient {
  opts: UpyunClientOptions;

  constructor(opts: UpyunClientOptions) {
    this.opts = opts;
  }

  async uploadCert(cookie: string,cert:CertInfo) {
    // https://console.upyun.com/api/https/certificate/
    const res = await this.doRequest({
      cookie: cookie,
      url: "https://console.upyun.com/api/https/certificate/",
      method: "POST",
      data: {
        certificate: cert.crt,
        private_key: cert.key
      }
    });
    if (!res.data?.result) {
      throw new Error("upload cert failed： " + JSON.stringify(res.data));
    }

    return res.data?.result?.certificate_id;
  }

  async getLoginToken() {
    const access = this.opts.access
    const http = this.opts.http;
    const res = await http.request({
      url: "https://console.upyun.com/accounts/signin/",
      method: "POST",
      data: {
        username: access.username,
        password: access.password
      },
      logRes: false,
      returnOriginRes: true
    });
    if (res.data?.errors?.length > 0 ) {
      throw new Error(JSON.stringify(res.data.msg));
    }
    if (res.data?.data?.error_code ) {
      throw new Error( "登录失败:"+res.data.data.message);
    }
    const cookie = res.headers["set-cookie"];
    return cookie;
  }

  async doRequest(req: {
    cookie: string,
    url: string,
    method: string,
    data: any
  }) {

    const res = await this.opts.http.request({
      url: req.url,
      method: req.method,
      data: req.data,
      headers: {
        Cookie: req.cookie
      }
    });
    if (res.msg?.errors?.length > 0) {
      throw new Error(JSON.stringify(res.msg));
    }
    if(res.data?.error_code){
      throw new Error(res.data?.message);
    }
    return res;
  }

}
