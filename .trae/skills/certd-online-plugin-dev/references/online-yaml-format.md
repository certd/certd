## 在线插件 YAML

在线插件始终以一个完整 YAML 文档传递、编辑、导入和导出。脚本源码必须放在顶层 `content` 字段中，不要输出独立的 `.ts` 文件，也不要使用 JSON Patch。

常用字段：

```yaml
name: DemoTask
author: demo
title: Demo-插件名称 # 格式：平台-功能 ，例如： 网宿-更新CDNpro证书 ； 阿里云-上传到CAS证书管理服务 ； 天翼云-更新CDN证书
desc: 插件说明
icon: clarity:plugin-line
pluginType: task
group: other
version: 1.0.0
input:
  cert: # 输入字段定义
    title: 域名证书
    required: true  # 是否必填
    component: # 输入字段组件
      name: cert-select # 前端vue组件名称
output:  # 【可选】输出字段定义
  cert:
    title: 证书 #输出字段标题
    type: "cert" # 输出字段类型
dependPlugins: # 依赖的插件
  # - access:certd/DemoAccess: *
dependPackages:  #  依赖的nodejs包
   # xxx: ^1.0.0
vip: "free" # 默认免费，plus 需要专业版
showRunStrategy: false # 【默认不显示】
default: {
  strategy: { 
    runStrategy: 0, # 运行策略， 0 = 成功后跳过，1 = 正常运行
  },
}
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

- `content` 必须使用 YAML 字面块 `|` 保留脚本换行，禁止使用折叠块 `>`；折叠换行可能导致多个 JavaScript 语句拼接，出现 `Unexpected token 'const'` 等解析错误。

- 统一使用 `await _ctx.import(...)` 加载模块。
- 使用 `_ctx.import("/@/...")` 以绝对路径加载 `certd-server/src/` 下的模块，`/@` 代表 `certd-server/src` 根路径。
- 需要确认模块时使用 `_ctx.logger`，插件执行过程使用 `this.logger`。
- 最后返回继承目标基类的 class。
- 不使用 `import`、`export`、装饰器或独立源码文件语法。
- 输入字段在 class 中声明为同名属性，并与 YAML 的 `input` 配置保持一致。
- HTTP 使用 `this.ctx.http`。默认 `request()` 返回响应体 `response.data`；需要 headers、status 或 Set-Cookie 时设置 `returnOriginRes: true`，此时返回原始响应对象，响应体从 `response.data` 读取。请求扩展参数 `skipSslVerify`、`skipCheckRes`、`logReq`、`logParams`、`logRes`、`logData`、`httpProxy`、`returnOriginRes` 的说明见 `context-utils.md`。
- 优先使用 `this.ctx.utils` 中已有的哈希、编码、字符串、域名和请求工具，详见 `context-utils.md`。
- 不要使用 `console.log`。
- 日志打印对象时使用 `JSON.stringify(value)`，不要直接拼接对象输出 `[object Object]`。
- 读取授权使用 `await this.getAccess(accessId)` 或目标基类规定的授权方式。
- 失败时抛出 `Error`，不要吞掉错误。

### 证书域名与列表选项

- 需要使用前置证书域名时，在列表字段之前配置 `certDomains`，组件使用 `cert-domains-getter`，并通过 `inputKey` 绑定证书字段。
- 列表选项可按证书域名匹配时，必须为每个选项设置 `domain`；该字段支持单个域名字符串或域名数组。只有配置该字段后，才使用 `this.ctx.utils.options.buildGroupOptions(options, this.certDomains)`。
- 服务商接口不支持翻页或服务端搜索时，远程选择组件不要配置 `pager: true`、`search: true`；本地搜索可在获取完整列表后过滤。

### 编辑规则

- 修改已有插件时保留 `name`、`author`、`pluginType` 和已有兼容字段。
- 新插件的 `author` 使用启动提示词中给出的插件作者，不要自行编造作者名；启动提示词未给出作者时先向用户确认。
- `fullName` 由 `author/name` 组成，作者变化会导致插件身份变化，不要随意修改。
- 只修改需求涉及的字段，避免删除未知的 YAML 字段。
- 脚本过长时仍放在同一个 `content` block scalar 中。
- 提交前检查 YAML 可解析、`content` 非空、版本和插件类型没有被意外修改。
