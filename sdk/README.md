# Certd OpenAPI SDK 示例

本目录提供 `/api/v1/cert/get` 接口的多语言 SDK 示例，演示如何封装 `CertdClient`，生成 `x-certd-token`，并按域名或证书 ID 获取证书。

## 目录结构

| 语言 | SDK 类/类型 | 调用示例 |
| --- | --- | --- |
| Node.js | `sdk/nodejs/certd-client.js` | `sdk/nodejs/get-cert.js` |
| Python | `sdk/python/certd_client.py` | `sdk/python/get_cert.py` |
| Go | `sdk/go/certd_client.go` | `sdk/go/get_cert.go` |
| PHP | `sdk/php/CertdClient.php` | `sdk/php/get_cert.php` |
| Java | `sdk/java/CertdClient.java` | `sdk/java/GetCert.java` |

`CertdClient` 提供以下核心方法：

- `getSign(content)` / `GetSign(content)`：根据 `content + keySecret` 生成签名
- `getToken()` / `GetToken()`：生成 `x-certd-token`
- `request(path, body)` / `Request(path, body)`：携带 token 发起 OpenAPI 请求
- `getCert(params)` / `GetCert(params)`：调用 `/api/v1/cert/get` 的便捷方法

## 接口说明

- 请求地址：`POST /api/v1/cert/get`
- 认证方式：请求头传入 `x-certd-token`
- `certId` 和 `domains` 至少传一个；两个都传时，服务端优先使用 `certId`
- `autoApply=true` 时，如果没有可用证书，会尝试自动创建或触发流水线申请证书
- `format` 可选：`pem`、`jks`、`pfx`、`der`、`one`、`p7b`

## Token 生成规则

1. 在 OpenKey 页面生成 `keyId` 和 `keySecret`
2. 构造 JSON 字符串：

```json
{"keyId":"你的 keyId","t":1710000000,"encrypt":false,"signType":"md5"}
```

3. 签名：`sign = md5(content + keySecret)`
4. Header：`x-certd-token = base64(content) + "." + base64(sign)`

注意：签名时必须使用和 base64 编码时完全相同的 `content` 字符串。

## 环境变量

所有示例都支持以下环境变量：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `CERTD_BASE_URL` | Certd 服务地址 | `http://127.0.0.1:7001` |
| `CERTD_KEY_ID` | OpenKey 的 keyId | 必填 |
| `CERTD_KEY_SECRET` | OpenKey 的 keySecret | 必填 |
| `CERTD_DOMAINS` | 域名列表，多个用英文逗号隔开 | 空 |
| `CERTD_CERT_ID` | 证书仓库证书 ID | 空 |
| `CERTD_AUTO_APPLY` | 不存在或过期时是否自动申请 | `false` |
| `CERTD_FORMAT` | 返回证书格式 | 空，表示返回所有格式 |
| `CERTD_ENCRYPT` | 是否要求接口加密返回结果 | `false` |

## 运行示例

PowerShell：

```powershell
$env:CERTD_BASE_URL = "http://127.0.0.1:7001"
$env:CERTD_KEY_ID = "your_key_id"
$env:CERTD_KEY_SECRET = "your_key_secret"
$env:CERTD_DOMAINS = "example.com,*.example.com"
$env:CERTD_AUTO_APPLY = "true"
$env:CERTD_FORMAT = "pem"

node sdk\nodejs\get-cert.js
python sdk\python\get_cert.py
go run sdk\go\certd_client.go sdk\go\get_cert.go
php sdk\php\get_cert.php
javac sdk\java\CertdClient.java sdk\java\GetCert.java && java -cp sdk\java GetCert
```

如果使用 `CERTD_CERT_ID` 获取证书，可以不传 `CERTD_DOMAINS`：

```powershell
$env:CERTD_CERT_ID = "1"
$env:CERTD_DOMAINS = ""
```

## 返回结果

`CERTD_ENCRYPT=false` 时，示例会直接打印接口返回的 JSON。

`CERTD_ENCRYPT=true` 时，接口返回内容会被服务端加密；这些示例只演示请求和 token 生成，不包含解密逻辑。
