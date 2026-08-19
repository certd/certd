## 在线插件 YAML

在线插件始终以一个完整 YAML 文档传递、编辑、导入和导出。脚本源码必须放在顶层 `content` 字段中，不要输出独立的 `.ts` 文件，也不要使用 JSON Patch。

常用字段：

```yaml
name: DemoTask
author: demo
title: Demo 任务
desc: 插件说明
icon: clarity:plugin-line
pluginType: task
group: other
version: 1.0.0
input:
  cert:
    title: 域名证书
    required: true
    component:
      name: cert-select
output: {}
dependPlugins: []
dependPackages: []
default: {}
content: |
  const { AbstractTaskPlugin } = await _ctx.import("@certd/pipeline")
  const { DemoAccess } = await _ctx.import("/@/plugins/plugin-lib/demo/access/index.js")
  _ctx.logger.info("DemoAccess:", DemoAccess)
  return class DemoTask extends AbstractTaskPlugin {
    async execute() {
      this.logger.info("执行成功")
    }
  }
```

### `content` 规则

- 统一使用 `await _ctx.import(...)` 加载模块。
- 使用 `_ctx.import("/@/...")` 以绝对路径加载 `certd-server/src/` 下的模块，`/@` 代表 `certd-server/src` 根路径。
- 需要确认模块时使用 `_ctx.logger`，插件执行过程使用 `this.logger`。
- 最后返回继承目标基类的 class。
- 不使用 `import`、`export`、装饰器或独立源码文件语法。
- 输入字段在 class 中声明为同名属性，并与 YAML 的 `input` 配置保持一致。
- HTTP 使用 `this.ctx.http`；
- 不要使用 `console.log`。
- 读取授权使用 `await this.getAccess(accessId)` 或目标基类规定的授权方式。
- 失败时抛出 `Error`，不要吞掉错误。

### 编辑规则

- 修改已有插件时保留 `name`、`author`、`pluginType` 和已有兼容字段。
- 只修改需求涉及的字段，避免删除未知的 YAML 字段。
- 脚本过长时仍放在同一个 `content` block scalar 中。
- 提交前检查 YAML 可解析、`content` 非空、版本和插件类型没有被意外修改。
