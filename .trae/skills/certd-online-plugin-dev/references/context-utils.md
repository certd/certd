# 在线插件运行时工具

在线插件实例可以通过 `this.ctx.utils` 复用 Certd 已有工具。开发前按分类查找现成方法，避免重复实现。

## 工具分类

| 分类 | 调用入口 | 常用方法 | 用途 |
| --- | --- | --- | --- |
| 哈希与编码 | `this.ctx.utils.hash` | `md5(data, digest?)`、`sha256(data, digest?)`、`base64(data)`、`base64Decode(data)`、`hmacSha256(data, digest?)`、`hmacSha256WithKey(key, data, digest?)`、`toHex(data)`、`hexToStr(data)`、`hexToNumber(data)` | 摘要、签名、Base64/Hex 编解码 |
| 字符串 | `this.ctx.utils.string` | 读取 `packages/core/basic/src/utils/util.string.ts` | 转换、截断、格式化 |
| 域名 | `this.ctx.utils.domain` | 读取 `packages/core/basic/src/utils/util.domain.ts` | 主域名和子域名处理，域名选项列表，域名匹配分组 |
| 请求 | `this.ctx.utils.request` / `this.ctx.http` | `getCookies(response)`、`getCookie(response, name)`、`download(config)` | Cookie、下载和请求辅助 |
| 文件 | `this.ctx.utils.file` | 读取 `packages/core/basic/src/utils/util.file.ts` | 文件读写 |
| Promise/延迟 | `this.ctx.utils.promises`、`this.ctx.utils.sleep` | 读取对应实现 | 重试、等待、并发 |
| 时间 | `this.ctx.utils.dayjs` | Day.js API | 时间处理 |
| ID/缓存/合并 | `this.ctx.utils.id`、`nanoid`、`cache`、`mergeUtils` | 读取对应 `util.*.ts` | ID、缓存和配置合并 |

示例：

```javascript
const passwd = this.ctx.utils.hash.md5(password);
const pass = this.ctx.utils.hash.base64(`salt_11${password}`);
```

方法签名以仓库中 `packages/core/basic/src/utils/util.*.ts` 为准，不要凭名称猜测参数顺序。

## `this.ctx.http.request` 返回结构

`this.ctx.http.request` 默认直接返回响应体，也就是 Axios 的 `response.data`：

```javascript
const body = await this.ctx.http.request({ url: "https://api.example.com/status", method: "GET" });
```

此时 `body` 不能再读取 `body.data`。如果需要响应头、状态码或 `Set-Cookie`，必须设置 `returnOriginRes: true`：

```javascript
const response = await this.ctx.http.request({
  url: "https://api.example.com/login",
  method: "POST",
  returnOriginRes: true,
  data: { username, password },
});
const body = response.data;
const setCookie = response.headers?.["set-cookie"];
const cookies = this.ctx.http.getCookies(response);
const sessionId = this.ctx.http.getCookie(response, "session_id");
```

规则：普通 API 直接使用 `response` 作为 body；需要 headers/status/Cookie 时使用 `returnOriginRes: true`，再从 `response.data` 读取 body。首页预请求和登录请求都需要 Cookie 时，两次请求都要设置该选项。`skipSslVerify: true` 仅在用户明确配置忽略证书校验时传入。

## `HttpRequestConfig` 请求参数

`this.ctx.http.request` 接受以下 Certd 扩展参数，同时兼容 Axios 的标准请求配置（如 `url`、`method`、`headers`、`params`、`data`、`timeout`、`responseType` 等）：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `skipSslVerify` | `boolean` | 为 `true` 时关闭 HTTPS 证书校验。仅在授权表单提供了明确开关且用户主动启用时传入。 |
| `skipCheckRes` | `boolean` | Certd 内部兼容参数，在线插件通常不需要设置。 |
| `logReq` | `boolean` | 是否打印请求地址和方法。默认开启；敏感请求可设为 `false`。 |
| `logParams` | `boolean` | 是否打印 URL 查询参数。默认关闭。参数中含密钥、Token 或隐私数据时保持关闭。 |
| `logRes` | `boolean` | 是否打印响应状态和响应体摘要。默认关闭。 |
| `logData` | `boolean` | 是否打印请求体。默认关闭；禁止对包含密码、Token、Cookie 或证书私钥的请求开启。 |
| `httpProxy` | `string` | 本次请求使用的 HTTP 代理地址。没有明确代理需求时不要设置。 |
| `returnOriginRes` | `boolean` | 默认返回响应体 `response.data`；设为 `true` 时返回 Axios 原始响应对象，可读取 `response.data`、`response.headers` 和 `response.status`。获取 `Set-Cookie` 时必须开启。 |

示例：

```javascript
const response = await this.ctx.http.request({
  url: `${baseUrl}/Action/login`,
  method: "POST",
  returnOriginRes: true,
  skipSslVerify: this.ignoreTls === true,
  logData: false,
  headers: { "Content-Type": "application/json" },
  data: requestData,
});
const body = response.data;
const cookies = response.headers?.["set-cookie"];
```

## Cookie 和文件下载辅助

原始响应可传给 HTTP 客户端提供的 Cookie 辅助方法：

```javascript
const cookies = this.ctx.http.getCookies(response);
const sessionId = this.ctx.http.getCookie(response, "session_id");
```

`getCookies(response)` 返回 `{ name, value }[]`；没有 `set-cookie` 时返回空数组。`getCookie(response, name)` 找不到目标 Cookie 时返回 `null`。

下载文件可使用 `this.ctx.http.download`，参数为 `{ http, config, savePath, logger }`，`config` 遵循 `HttpRequestConfig`：

```javascript
await this.ctx.http.download({
  http: this.ctx.http,
  config: { url: fileUrl, method: "GET", logRes: false },
  savePath,
  logger: this.ctx.logger,
});
```
