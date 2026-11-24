# 开放接口

通过 OpenAPI 按域名或证书 ID 获取证书，也可触发申请和发送通知。[完整接口参考（Apifox）](https://apifox.com/apidoc/shared-2e76f8c4-7c58-413b-a32d-a1316529af44/254949529e0)

## 创建 API 密钥

1. 打开「设置 → 开放接口密钥」，新建密钥并记录 `keyId` 和 `keySecret`。在备注中标明调用方。
2. 获取证书、发送通知和上报客户端心跳可使用「仅开放接口」密钥。「账户所有权限」仍受账号和接口权限约束。
3. 企业模式下，切换到目标项目再创建密钥。接口使用密钥绑定的项目。非企业模式下，密钥按所属用户访问资源，创建时指定的项目 ID 会被忽略。
4. 客户端需要证书文件密码时，为密钥开启「返回证书密码」。对应证书记录保存了密码时，响应的 `data.certPassword` 会包含密码。

## 请求签名

在请求头传入 `x-certd-token`。每次签名使用当前 Unix 时间戳（秒），允许前后 180 秒偏差。

1. 将 `keyId`、`t`、`encrypt: false`、`signType: "sha256"` 序列化为 UTF-8 JSON 字符串。
2. 将 JSON 字符串和 `keySecret` 直接拼接，计算 SHA-256 十六进制摘要。服务端也支持 `signType: "md5"`，此时使用 MD5 十六进制摘要。
3. 分别对原始 JSON 和十六进制摘要字符串做标准 Base64 编码，中间用 `.` 连接。编码时使用与签名完全相同的 JSON 字符串。

将下面的示例存为 `get-cert.mjs`，设置 `CERTD_URL` 为 Certd 访问地址，包含部署使用的路径前缀。设置 `CERTD_KEY_ID` 和 `CERTD_KEY_SECRET` 后，换成证书实际覆盖的域名，用 Node.js 18 或更新版本运行 `node get-cert.mjs`。

```js
import { createHash } from "node:crypto"

const content = JSON.stringify({
  keyId: process.env.CERTD_KEY_ID,
  t: Math.floor(Date.now() / 1000),
  encrypt: false,
  signType: "sha256",
})
const signature = createHash("sha256")
  .update(content + process.env.CERTD_KEY_SECRET)
  .digest("hex")
const token = [content, signature]
  .map(value => Buffer.from(value).toString("base64"))
  .join(".")

const baseUrl = process.env.CERTD_URL.replace(/\/+$/, "")
const response = await fetch(`${baseUrl}/api/v1/cert/get`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-certd-token": token },
  body: JSON.stringify({ domains: "www.example.com", format: "pem" }),
})
const result = await response.json()
if (!response.ok || result.code !== 0) {
  throw new Error(result.message ?? `HTTP ${response.status}`)
}
console.log(result.data.detail)
```

响应以 `code` 表示业务结果，`0` 表示成功。`message` 是提示信息，`data` 是结果。申请尚未完成时，错误响应示例如下。

```json
{
  "code": 20013,
  "message": "证书正在申请中，请稍后重新获取",
  "data": {
    "pipelineId": 42,
    "certId": 123
  }
}
```

升级自 `v1.39.0` 之前的版本时，将客户端对 `msg` 的读取改为 `message`。同时调用新旧实例的客户端可使用 `result.message ?? result.msg`。

## 获取证书

使用 `GET /api/v1/cert/get` 的查询参数，或 `POST /api/v1/cert/get` 的 JSON 请求体。

| 参数 | 用法 |
| --- | --- |
| `certId` | 证书仓库中的证书 ID。传入后直接按 ID 查询。 |
| `domains` | 多个域名用英文逗号分隔。匹配有效证书时先比较通配符数量，再比较域名数量，优先选择数量较少的证书。 |
| `pipelineId` | 按域名查询时，将候选证书限制到指定流水线。 |
| `format` | 可选 `pem`、`der`、`p12`、`pfx`、`jks`、`one`、`p7b`。省略时返回已有格式。 |

查询 `www.example.com` 时，如果 `www.example.com` 和 `*.example.com` 两张有效证书都匹配，优先返回覆盖 `www.example.com` 的具体域名证书。证书响应的 `data.detail` 包含 `id`、`domains` 和 `notAfter`。

### 没有有效证书时自动申请

按域名查询时传入布尔值 `autoApply: true`。使用 POST JSON 可确保传入布尔值。已有匹配的有效证书时直接返回，否则尝试复用现有流水线或新建申请流水线。

1. 预先在「域名管理」配置验证方式，并准备 ACME 账号和联系邮箱。
2. 新建申请流水线时，`autoApplyTemplateId` 可指定申请参数模板。传 `0` 使用默认模板，省略时不用模板。`autoApplyParams` 覆盖模板的同名字段。
3. 返回 `20013` 时稍后用相同参数查询。返回 `20014` 时检查域名校验配置。返回 `20015` 时查看流水线运行日志，修正错误后重试。

```json
{
  "domains": "www.example.com",
  "format": "pem",
  "autoApply": true,
  "autoApplyTemplateId": 0
}
```

## 发送通知

调用 `POST /api/v1/notification/send`，使用同一签名请求头。请求体的 `title` 和 `content` 必填，可附加 `url`。省略 `notificationId` 时使用默认通知渠道。

```json
{
  "title": "证书部署完成",
  "content": "www.example.com 的证书已更新"
}
```

## 常见问题

- **签名或时间戳错误。** 检查系统时钟是否同步、时间戳单位是否为秒，以及签名是否先转成十六进制再做 Base64。
- **按域名找不到证书。** 确认密钥所属用户或项目、证书状态和覆盖域名。可先按证书 ID 查询。
- **返回结果没有密码。** 检查密钥是否开启「返回证书密码」，以及证书记录是否含密码。

## 证书客户端

- [Certd Client 接入指南](./client.md)涵盖首次同步、后台服务和排查方法。
- [SSL-Assistant](https://github.com/Youngxj/SSL-Assistant)是第三方客户端，可扫描 Nginx 配置并从 Certd 拉取证书。
