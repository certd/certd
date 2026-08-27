---
name: certd-online-dns-provider-dev
description: 用于开发 Certd 在线 DNS Provider 插件。输出完整 YAML，content 中返回继承 AbstractDnsProvider 的 class。
---

# 在线 DNS Provider 插件

读取父 Skill 的 `references/online-yaml-format.md`。不要沿用旧版 `@IsDnsProvider` 装饰器和独立 TypeScript 文件。

## 输出结构

- `pluginType` 使用 `dnsProvider`。
- `input` 中配置授权选择、域名或平台所需的参数。
- `content` 中实现创建和删除 DNS 记录的 class。

## `content` 模板

```javascript
const { AbstractDnsProvider } = await _ctx.import("@certd/pipeline")
const { DemoAccess } = await _ctx.import("/@/plugins/plugin-lib/demo/access/index.js")
_ctx.logger.info("DemoAccess:", DemoAccess)

return class DemoDnsProvider extends AbstractDnsProvider {
  accessId

  async onInstance() {
    this.access = await this.getAccess(this.accessId)
  }

  async createRecord(options) {
    const { fullRecord, value, type, domain } = options
    this.logger.info("添加 DNS 记录", { fullRecord, type, domain })
    const res = await this.ctx.http.request({
      url: "https://api.example.com/dns/records",
      method: "POST",
      data: { fullRecord, value, type, domain },
    })
    if (res.error) {
      throw new Error(`创建 DNS 记录失败: ${res.message}`)
    }
    return res.data
  }

  async removeRecord(options) {
    const { fullRecord, value, domain } = options.recordReq
    const res = await this.ctx.http.request({
      url: "https://api.example.com/dns/records",
      method: "DELETE",
      data: { fullRecord, value, domain },
    })
    if (res.error) {
      this.logger.warn("删除 DNS 记录失败", res.message)
      return
    }
    this.logger.info("删除 DNS 记录成功", fullRecord)
  }
}
```

## 编写要求

- 统一使用 `await _ctx.import(...)` 加载模块。
- 使用 `_ctx.import("/@/...")` 通过绝对路径加载 `server/src/` 下的模块，`/@` 代表 `server/src` 根路径。
- 需要记录模块加载信息时使用 `_ctx.logger`。
- 返回继承 `AbstractDnsProvider` 的 class。
- `createRecord` 必须返回删除时需要的记录信息。
- `removeRecord` 使用 `options.recordReq` 和 `options.recordRes`。
- 只处理业务 API 所需的 TXT 记录参数，不在日志中输出授权密钥。
- 网络失败、授权失败和 API 业务失败要有明确日志；创建失败必须抛出异常。
- 保持创建和删除幂等，避免清理失败阻断无关流程。
- 一般将API接口方法封装到Access中，其他plugin使用access当做client sdk使用
