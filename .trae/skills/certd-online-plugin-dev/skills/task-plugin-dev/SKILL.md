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


## runStrategy

整个流水线每次运行，会记录每个任务的运行结果状态，如果上次任务执行成功，且 runStrategy 为成功后跳过，那么下次运行时会跳过该任务。


- `showRunStrategy`: false 【默认不显示】
  - 任务配置时是否显示 runStrategy 字段，用于指定任务的执行策略。
- `default.strategy.runStrategy`: 0 【默认成功后跳过】
  - 0 表示成功后跳过，1 表示正常运行。 
  - 设置任务的默认运行策略runStrategy。

当证书申请任务，申请证书成功后，会清空后续任务状态。此时后续`runStrategy = 0` 的任务，会重新执行。
这样可以保证相同的证书不会重复部署。

在其他场景的部署任务，可能希望每次运行都检查是否需要部署，如果即将过期就部署，没有过期就跳过。
此时可以设置 `default.strategy.runStrategy = 1`，然后在`execute`方法中，如果没有过期，就返回 `"skip"`。

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
      // 抛异常让任务执行失败
      throw new Error(`任务执行失败: ${res.message}`)
    }
    this.logger.info("执行成功")
    // 还可以返回 "skip" 表示当前任务没有执行任何操作
    // 一般与 runStrategy = 1 配合使用。 (1=正常运行，0表示成功后跳过)
    // 比如检查无需更新，时就 返回 "skip"
    // return "skip"
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
- 一般将API接口方法封装到Access中，其他plugin使用access当做client sdk使用
