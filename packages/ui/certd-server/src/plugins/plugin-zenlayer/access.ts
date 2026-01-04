import { HttpRequestConfig } from '@certd/basic';
import { IsAccess, AccessInput, BaseAccess, PageSearch } from '@certd/pipeline';
import qs from 'qs';

export type ZenlayerRequest = HttpRequestConfig & {
  action: string;
  version?: string;
}
/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'zenlayer',
  title: 'Zenlayer授权',
  icon: 'svg:icon-zenlayer',
  desc: 'Zenlayer授权',
})
export class ZenlayerAccess extends BaseAccess {

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'AccessKeyId',
    component: {
      placeholder: '访问密钥ID',
    },
    helper: "[访问密钥管理](https://console.zenlayer.com/accessKey)获取",
    required: true,
    encrypt: false,
  })
  accessKeyId = '';


  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'AccessKey Password',
    component: {
      placeholder: '访问密钥密码',
    },
    required: true,
    encrypt: true,
  })
  accessKeyPassword = '';




  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "点击测试接口是否正常"
  })
  testRequest = true;

  client: any;

  async onTestRequest() {
    await this.getCertList();
    return "ok";
  }


  async getCertList(req: PageSearch = {}) {
    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 100;
    const res = await this.doRequest({
      url: "/",
      baseURL: "https://console.zenlayer.com/api/v2/cdn",
      action: "DescribeCertificates",
      data: {
        PageNum: pageNo,
        PageSize: pageSize
      }
    });
    return res;
  }


  /**
   * 申请安全凭证
本文使用的安全凭证为密钥，密钥包括 accessKeyId 和 accessKeyPassword。

AccessKeyId：用于标识 API 调用者身份，可以简单类比为用户名。

AccessKeyPassword：用于验证 API 调用者的身份，可以简单类比为密码。

用户必须严格保管安全凭证，避免泄露，否则将危及财产安全。如已泄漏，请立刻禁用该安全凭证。

你可以根据Zenlayer的用户指南文档来获取你的安全凭证。

签名过程v2
Zenlayer Open API V2 支持 Post 请求，仅支持 Content-Type: application/json。 接口使用json格式进行调用。

下面以裸机云查询实例列表为例：


复制
curl -X POST https://console.zenlayer.com/api/v2/bmc \
-H "Authorization: ZC2-HMAC-SHA256 Credential=0D9UtpyKYcHxms5v, SignedHeaders=content-type;host, Signature=efb356c32e55c781e10dc676da59462c22596d82e91c57803666243379555b2f" \
-H "Content-Type: application/json; charset=utf-8" \
-H "X-ZC-Action: DescribeInstances" \
-H "X-ZC-Timestamp: 1673361177" \
-H "X-ZC-Signature-Method: ZC2-HMAC-SHA256" \
-H "X-ZC-Version: 2022-11-20" \
-d '{"pageSize":10,"pageNum":1,"zoneId":"HKG-A"}'
Request Headers:

Key
说明
示例
X-ZC-Timestamp

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

1. 拼接规范请求串
按如下伪代码格式拼接规范请求串（CanonicalRequest）：


复制
CanonicalRequest = 
  HTTPRequestMethod + '\n' + 
  CanonicalURI + '\n' + 
  CanonicalQueryString + '\n' + 
  CanonicalHeaders + '\n' + 
  SignedHeaders + '\n' + 
  HexEncode(Hash(RequestPayload))
字段名称
解释
HTTPRequestMethod

HTTP 请求方法。

固定为POST。

CanonicalURI

URI 参数。

API 固定为正斜杠（/）。

CanonicalQueryString

发起 HTTP 请求 URL 中的查询字符串。

对于 POST 请求，固定为空字符串""。

CanonicalHeaders

参与签名的头部信息，可加入自定义的头部参与签名以提高自身请求的唯一性和安全性。

拼接规则：头部 key 和 value 统一转成小写，并去掉首尾空格，按照 key:value\n 格式拼接（注意最后包含'\n'）；多个头部，按照头部 key（小写）的 ASCII 升序进行拼接。此示例计算结果是：

content-type:application/json; charset=utf-8\nhost:console.zenlayer.com。

SignedHeaders

参与签名的头部信息。

说明此次请求有哪些头部参与了签名，和 CanonicalHeaders 包含的头部内容是一一对应的。content-type 和 host 为必选头部。 拼接规则：头部 key 统一转成小写；多个头部 key（小写）按照 ASCII 升序进行拼接，并且以分号（;）分隔。此示例为content-type;host。

HashedRequestPayload

请求正文（payload，即 body)。

此示例为{"pageSize":10,"pageNum":1,"zoneId":"HKG-A"}）的哈希值，计算伪代码为 HexEncode(Hash(RequestPayload))，即对 HTTP 请求正文做 SHA256 哈希，然后十六进制编码。此示例的计算结果是 ：5f714687ba91c606d503467766151206392474accd137ffea6dce2420b67c29a。

2. 拼接待签字符串

复制
StringToSign =
    Algorithm + \n +           # 指定签名算法。对于 SHA256，算法为 ZC2-HMAC-SHA256。
    RequestDateTime + \n +     # 指定请求时间戳。
    HashedCanonicalRequest 
字段名称
解释
Algorithm

签名算法。

目前固定为 ZC2-HMAC-SHA256。

RequestTimestamp

请求时间戳。

即请求头部的公共参数 X-ZC-Timestamp 取值，取当前时间 UNIX 时间戳，精确到秒。此示例取值为1673361177。

HashedCanonicalRequest

前述步骤拼接所得规范请求串的哈希值。

计算伪代码为 Lowercase(HexEncode(Hash.SHA256(CanonicalRequest)))。此示例计算结果是： 29396f9dfa0f03820b931e8aa06e20cda197e73285ebd76aceb83f7dede493ee。

根据以上规则，示例中得到的待签名字符串如下：


复制
ZC2-HMAC-SHA256
1673361177
29396f9dfa0f03820b931e8aa06e20cda197e73285ebd76aceb83f7dede493ee
3. 基于 AK 和 StringToSign 计算出签名
计算签名，伪代码如下：


复制
Signature = HexEncode(HMAC_SHA256(AccessKeyPassword, StringToSign))
字段名称
解释
AccessKeyPassword

原始的 AccessKeyPassword。

如 Gu5t9xGARNpq86cd98joQYCN3。

StringToSign

步骤二获得的结果。

4. 拼接 Authorization
按如下格式拼接 Authorization：


复制
Authorization =
    Algorithm + ' ' +
    'Credential=' + AccessKeyId +  ', ' +
    'SignedHeaders=' + SignedHeaders + ', ' +
    'Signature=' + Signature
字段名称
解释
Algorithm

签名算法。

目前为 ZC2-HMAC-SHA256。

AccessKeyId

密钥对中的 AccessKeyId。

如 0D9UtpyKYcHxms5v。

SignedHeaders

见上文，参与签名的头部信息。

此示例取值为 content-type;host。

Signature

签名值。

根据以上方法，此示例计算结果是 efb356c32e55c781e10dc676da59462c22596d82e91c57803666243379555b2f。
   */


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
    if (!req.headers['content-type']) {
      req.headers['content-type'] = "application/json; charset=utf-8";
    }
    if (!req.headers['host']) {
      req.headers['host'] = "console.zenlayer.com";
    }

    const CanonicalQueryString = req.method === 'POST' ? '' : qs.stringify(req.params);
    const SignedHeaders = "content-type;host";
    const CanonicalHeaders = `${req.headers['content-type']}\n${req.headers['host']}`;
    const HashedRequestPayload = this.ctx.utils.hash.sha256(JSON.stringify(req.data || {}), "hex");
    const CanonicalRequest = `${req.method}\n${req.url}\n${CanonicalQueryString}\n${CanonicalHeaders}\n${SignedHeaders}\n${HashedRequestPayload}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signMethod = "ZC2-HMAC-SHA256";

    const StringToSign = `${signMethod}\n${timestamp}\n${this.accessKeyId}\n${CanonicalRequest}`;

    const signature = this.ctx.utils.hash.hmacSha256(StringToSign, "hex");

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
      'X-ZC-Timestamp': timestamp.toString(),
      'X-ZC-Action': req.action,
      'X-ZC-Version': req.version || "2022-11-20",
      'X-ZC-Signature-Method': signMethod,
      'Authorization': authorization,
    };
  }

  async doRequest(req: ZenlayerRequest) {
    const headers = await this.getAuthorizationHeaders(req);
    req.headers = headers
    const res = await this.ctx.http.request({
      baseURL: req.baseURL || "https://console.zenlayer.com",
      ...req
    });
    this.ctx.logger.info(`doRequest ${req.url} ${res.statusCode} ${JSON.stringify(res.data)}`);
    return res;
  }


}

new ZenlayerAccess();
