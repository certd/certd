import { HttpRequestConfig } from "@certd/basic";
import { IsAccess, AccessInput, BaseAccess, PageSearch } from "@certd/pipeline";
import qs from "qs";

export type ZenlayerRequest = HttpRequestConfig & {
  action: string;
  version?: string;
};
/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "zenlayer",
  title: "Zenlayer授权",
  icon: "svg:icon-lucky",
  desc: "Zenlayer授权",
})
export class ZenlayerAccess extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: "AccessKeyId",
    component: {
      placeholder: "访问密钥ID",
    },
    helper: "[访问密钥管理](https://console.zenlayer.com/accessKey)获取",
    required: true,
    encrypt: false,
  })
  accessKeyId = "";

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: "AccessKey Password",
    component: {
      placeholder: "访问密钥密码",
    },
    required: true,
    encrypt: true,
  })
  accessKeyPassword = "";

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "点击测试接口是否正常",
  })
  testRequest = true;

  client: any;

  async onTestRequest() {
    const res = await this.getCertList({ pageSize: 1 });
    this.ctx.logger.info(res);
    return "ok";
  }

  async getCertList(req: PageSearch = {}): Promise<{ totalCount: number; dataSet: { sans: string[]; certificateId: string; certificateLabel: string; common: string }[] }> {
    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 100;
    const res = await this.doRequest({
      url: "/api/v2/cdn",
      action: "DescribeCertificates",
      data: {
        PageNum: pageNo,
        PageSize: pageSize,
      },
    });
    return res;
  }

  async getAuthorizationHeaders(req: ZenlayerRequest) {
    /**
     * CanonicalRequest = 
  HTTPRequestMethod + '\n' + 
  CanonicalURI + '\n' + 
  CanonicalQueryString + '\n' + 
  CanonicalHeaders + '\n' + 
  SignedHeaders + '\n' + 
  HexEncode(Hash(RequestPayload))
     */
    if (!req.headers) {
      req.headers = {};
    }
    if (!req.headers["content-type"]) {
      req.headers["content-type"] = "application/json; charset=utf-8";
    }
    if (!req.headers["host"]) {
      req.headers["host"] = "console.zenlayer.com";
    }

    if (!req.method) {
      req.method = "POST";
    }
    // this.accessKeyPassword="Gu5t9xGARNpq86cd98joQYCN3"
    // req.data = {"pageSize":10,"pageNum":1,"zoneId":"HKG-A"}
    const CanonicalQueryString = req.method === "POST" ? "" : qs.stringify(req.params);
    const SignedHeaders = "content-type;host";
    const CanonicalHeaders = `content-type:${req.headers["content-type"]}\nhost:${req.headers["host"]}\n`;
    const HashedRequestPayload = this.ctx.utils.hash.sha256(JSON.stringify(req.data || {}), "hex");
    const CanonicalRequest = `${req.method}\n/\n${CanonicalQueryString}\n${CanonicalHeaders}\n${SignedHeaders}\n${HashedRequestPayload}`;
    const HashedCanonicalRequest = this.ctx.utils.hash.sha256(CanonicalRequest, "hex");
    // HashedCanonicalRequest = "29396f9dfa0f03820b931e8aa06e20cda197e73285ebd76aceb83f7dede493ee"
    const timestamp = Math.floor(Date.now() / 1000);
    // const timestamp= 1673361177
    const signMethod = "ZC2-HMAC-SHA256";
    const StringToSign = `${signMethod}\n${timestamp}\n${HashedCanonicalRequest}`;
    const signature = this.ctx.utils.hash.hmacSha256WithKey(this.accessKeyPassword, StringToSign, "hex");
    const authorization = `${signMethod} Credential=${this.accessKeyId}, SignedHeaders=${SignedHeaders}, Signature=${signature}`;

    /**
     * X-ZC-Timestamp

请求的时间戳，精确到秒

1673361177

X-ZC-Version

请求的API版本

2022-11-20

X-ZC-Action

请求的动作

DescribeInstances

X-ZC-Signature-Method

签名方法

ZC2-HMAC-SHA256

Authorization

签名认证
     */
    return {
      ...req.headers,
      "X-ZC-Timestamp": timestamp.toString(),
      "X-ZC-Action": req.action,
      "X-ZC-Version": req.version || "2022-11-20",
      "X-ZC-Signature-Method": signMethod,
      Authorization: authorization,
    };
  }

  async doRequest(req: ZenlayerRequest) {
    const headers = await this.getAuthorizationHeaders(req);
    req.headers = headers;
    let res: any = undefined;
    try {
      res = await this.ctx.http.request({
        baseURL: req.baseURL || "https://console.zenlayer.com",
        ...req,
      });
    } catch (error) {
      const resData = error.response?.data;
      if (resData) {
        let desc = "";
        if (resData.code === "CERTIFICATE_NOT_COVER_ALL_DOMAIN") {
          desc = `证书未覆盖所有域名`;
        }
        throw new Error(`[code=${resData.code}] ${desc} ${resData.message} [requestId:${resData.requestId}]`);
      }
      throw error;
    }
    if (res.code) {
      throw new Error(`[${res.code}]:${res.message} [requestId:${res.requestId}]`);
    }
    return res.response;
  }
}

new ZenlayerAccess();
