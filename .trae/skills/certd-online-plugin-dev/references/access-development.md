# Access 开发规范

Access 插件负责保存授权配置，也负责封装平台 API/SDK，供 Task 和 DNS Provider 复用。

## 查询顺序

1. 调用 `/scoped/sys/ai/plugin/find`，使用 `pluginType: access`。
2. 根据 `name`、`author`、`fullName` 识别目标 Access。
3. 使用 `/scoped/sys/ai/plugin/export` 读取完整 YAML。
4. 检查 `content` 中已经提供的方法。

## 修改规则

- Access 的 `editable: true` 时才允许修改。
- 修改前先保存本地历史。
- 优先把通用 API/SDK 能力放入 Access。
- 业务插件通过 `dependPlugins` 依赖 Access。
- `editable: false` 时不要尝试修改 Access，在业务插件内部实现必要的调用。
- 不要在日志中打印完整授权配置。

## 地址与请求复用

- `BaseAccess` 已提供通用的 `normalizeEndpoint(endpoint)`，用于校验地址并清理 URL 末尾的 `/`。Access 插件直接调用 `this.normalizeEndpoint(this.endpoint)`，不要在插件中重复实现同名方法。
- Cookie 解析优先使用 `this.ctx.http.getCookies(response)` 或 `this.ctx.http.getCookie(response, name)`；需要原始响应时为请求设置 `returnOriginRes: true`。

## TLS 证书校验

需要兼容自签名或过期 HTTPS 证书时，在 Access 表单中使用 `skipSslVerify` 开关，并将其显式传给 `this.ctx.http.request`。默认关闭校验跳过，仅用户主动开启后才跳过：

```yaml
input:
  skipSslVerify:
    title: 忽略 HTTPS 证书校验
    required: false
    component:
      name: a-switch
      vModel: checked
```

```js
const response = await this.ctx.http.request({
  url: `${baseUrl}/api`,
  method: "POST",
  skipSslVerify: this.skipSslVerify === true,
});
```

## 测试按钮

通过 `api-test` 输入项绑定 `onTestRequest`，用户点击按钮后 Certd 会调用该方法。测试方法应执行轻量、只读的连通性请求，并在失败时抛出有意义的错误：

```yaml
input:
  testRequest:
    title: 测试
    component:
      name: api-test
      action: onTestRequest
    helper: 点击测试接口是否正常
```

```js
async onTestRequest() {
  const baseUrl = this.normalizeEndpoint(this.endpoint);
  const response = await this.ctx.http.request({
    url: `${baseUrl}/api/status`,
    method: "GET",
    skipSslVerify: this.skipSslVerify === true,
  });

  if (!response || response.code !== 0) {
    throw new Error(`连接测试失败：${response?.message || "接口返回异常"}`);
  }

  return "连接成功";
}
```
