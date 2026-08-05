---
name: certd-online-task-plugin-dev
description: 用于开发 Certd 在线 Task 插件。输出完整 YAML，脚本源码放在 content 字段中，继承 AbstractTaskPlugin 并返回插件 class。
---

# 在线 Task 插件

读取父 Skill 的 `references/online-yaml-format.md`。在线插件不是原来的装饰器源码文件模式。

## 输出结构

- `pluginType` 使用 `task`。
- 保留或填写 `name`、`author`、`title`、`desc`、`icon`、`group`、`version`。
- 输入配置放在 YAML 的 `input` 字段。
- 执行脚本放在 YAML 顶层 `content` 字段。

## `content` 模板

```javascript
const { AbstractTaskPlugin } = await _ctx.import("@certd/pipeline")
const { DemoAccess } = await _ctx.import("/@/plugins/plugin-lib/demo/access/index.js")
_ctx.logger.info("DemoAccess:", DemoAccess)

return class DemoTask extends AbstractTaskPlugin {
  cert
  certDomains
  accessId

  async execute() {
    const access = await this.getAccess(this.accessId)
    this.logger.info("开始执行任务", { access })
    const res = await this.ctx.http.request({
      url: "https://api.example.com",
    })
    if (res.error) {
      throw new Error(`任务执行失败: ${res.message}`)
    }
    this.logger.info("执行成功")
  }
}
```

## 编写要求

- 统一用 `await _ctx.import(...)` 加载模块。
- 使用 `_ctx.import("/@/...")` 通过绝对路径加载 `server/src/` 下的模块，`/@` 代表 `server/src` 根路径。
- 需要记录模块加载信息时使用 `_ctx.logger`。
- 返回继承 `AbstractTaskPlugin` 的 class，不写 `export class`。
- class 属性名必须对应 `input` 配置的字段名。
- 用 `this.logger` 记录关键步骤。
- 用 `this.ctx.http` 请求远程 API，用 `this.getAccess` 获取授权。
- 外部 API 返回失败或业务失败时抛出异常。
- 对重复执行保持幂等，避免把真实 Token、证书和私钥写入日志。
- 修改完成后把整个 YAML 通过 Certd `/scoped/sys/ai/plugin/import` 保存。
