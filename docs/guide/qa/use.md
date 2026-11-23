# 常见问题

## 是否支持 IP 证书

支持。申请公网 IP 证书时可选 Let's Encrypt，验证方式使用 HTTP 文件验证。按 [IP 证书申请](../use/cert/ip.md) 配置。

## 多久运行一次流水线

证书流水线可设为每天运行一次。证书是否重新申请取决于申请任务的到期更新天数，后续部署任务也会按其运行策略执行。首次配置可参考 [创建申请流水线](../use/cert/index.md#创建申请流水线)。

## `too many certificates` 或其它申请限流

这是颁发机构返回的限流。先查看日志中的限流类型和重试时间，按颁发机构提示等待。本地调试 Let's Encrypt 流程时可用测试环境，确认成功后切换到生产机构。避免在限流期间反复强制运行生产申请。

## SSL.com 提示 CAA 未允许签发

在实际控制申请域名的 DNS 区域检查 CAA。普通域名使用 `issue`，如果区域通过 `issuewild` 限制了泛域名，也应检查相应条目。下表示例允许 SSL.com 签发。

| 记录类型 | 主机记录 | 标志 | 标签 | 颁发机构值 |
| --- | --- | --- | --- | --- |
| CAA | `@` | `0` | `issue` | `ssl.com` |
| CAA | `@` | `0` | `issuewild` | `ssl.com` |

检查现有记录涉及的其它证书后再调整，避免影响其它颁发机构。

## 启动时出现 `address family not supported`

如果系统不支持绑定 IPv6，可以给 Certd 设置 `certd_koa_hostname=0.0.0.0`。Docker Compose 示例将环境变量加入现有的 Certd 服务。

```yaml
services:
  certd:
    environment:
      certd_koa_hostname: "0.0.0.0"
```

需要 IPv6 时，按 [IPv6 支持](../use/setting/ipv6.md) 配置部署环境。

## DNS 验证失败

例如看到 `NXDOMAIN looking up TXT for _acme-challenge`，先核对实际权威 DNS、记录名称和 DNS 授权。按 [DNS 验证排错](../use/cert/validation.md#排查-dns-验证失败) 检查 CNAME、DNSSEC、CAA 或记录传播。

## 同一份证书多次上传到云平台

可以先上传一次证书，再让后续任务引用该次上传输出的云端证书 ID。详见 [证书复用](../use/pretask/index.md)。
