---
name: certd-online-plugin-dev
description: 用于通过 Certd API 开发、修改、读取、保存和恢复在线插件。当用户要求使用 Codex 或 Trae 创建 Task、DNS Provider、Access 插件，或优化已有 Certd 插件时使用。
---

# Certd 在线插件开发 Skill

## 开发方式

本 Skill 使用 Certd HTTP API，不使用 WebSocket，也不依赖浏览器传递代码草稿。

- 前端只生成包含需求、API 地址和认证 Token 的启动提示词。
- Agent 直接调用 Certd API 读取和保存插件 YAML。
- Agent 的进度、日志和代码修改在 Codex/Trae 中查看。
- 插件开发临时文件和修改历史统一保存在 Agent 工作区的 `.tmp/online-plugin-dev/` 下，不保存到浏览器或 Certd 后端。

## 启动检查

开始开发前先确认当前工作目录是否已经在 Certd 项目内：

- 应存在 `package.json`。
- 应存在 `packages/ui/certd-server/src/plugins/`。
- 应存在 `.trae/skills/`。
- 应存在 `.trae/skills/certd-online-plugin-dev/SKILL.md`。

如果当前目录不是 Certd 项目，或缺少 `certd-online-plugin-dev` Skill，先拉取 Certd 仓库代码并切换到仓库内工作( --depth 1 拉取第一层即可)：

1. 优先使用 `https://atomgit.com/certd/certd/`。
2. 如果 AtomGit 拉取失败，再使用 `https://github.com/certd/certd`。
3. 拉取后重新检查上述特征，并读取 `.trae/skills/certd-online-plugin-dev/SKILL.md`。

开发插件时，参考 Certd 项目下已有内置插件实现：`packages/ui/certd-server/src/plugins/`。

## 插件来源

Certd 插件按来源分为三类：

- 内置插件：`type: "builtIn"`，随 Certd 安装包提供。可读取并在流水线中使用，不应通过本 Skill 修改或覆盖。
- 市场插件：`type: "store"`，且存在 `appId` 或 `developerId`。它来自在线插件市场，可能尚未安装到本地；是否可修改只能以接口返回的 `editable` 为准。
- 本地插件：`type: "store"`，但没有 `appId` 和 `developerId`。它是当前 Certd 实例本地创建、导入或复制的插件，可直接保存；发布到市场后会带上市场归属信息。

不要只根据 `type: "store"` 判断插件是否来自市场，也不要自行推断编辑权限；始终使用列表结果中的 `editable` 字段。

## API 认证

提示词会提供 Certd API 地址和仅限 AI 插件开发接口的受限 Token。调用 API 时使用：

```http
Authorization: <token>
Content-Type: application/json
```

不要把 Token 写入代码、历史摘要、日志、提交信息或插件 YAML。

所有 Certd API 请求统一使用 Node.js 18+ 的 `fetch`。不要使用 PowerShell 的 `Invoke-RestMethod`、`Invoke-WebRequest` 或 .NET HTTP 客户端发送插件 YAML/JSON；它们在 Windows 上可能造成中文乱码或使完整 YAML 导入请求长时间无响应。

Node 请求须直接读取 UTF-8 文件或在 Node 内构造 JSON，并使用 `JSON.stringify`：

```javascript
const response = await fetch(`${apiBase}/scoped/sys/ai/plugin/find`, {
  method: "POST",
  headers: { Authorization: token, "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ keywords: ["nginx"], includeBuiltIn: true, includeStore: true }),
})
```

## UTF-8 保存

在 Windows 上，Node 直接以 UTF-8 读取 YAML 并用 `JSON.stringify` 发送；不要让 PowerShell 转发含中文的 YAML/JSON。保存后检查中文字段不含 `?`，再调用 `/scoped/sys/ai/plugin/find` 或 `/scoped/sys/ai/plugin/info` 验证。

## API 工作流

1. 使用 `/scoped/sys/ai/plugin/find` 查询插件和 Access，可通过 `keywords` 数组传递多个关键词。
2. 查询结果包含 `editable`：
   - `editable: true`：允许当前 Agent 修改并保存。
   - `editable: false`：只能读取和使用，不能修改。
3. 读取完整 YAML 时调用 `/scoped/sys/ai/plugin/export`。
4. 所有插件保存统一调用 `/scoped/sys/ai/plugin/import`，并始终传递完整 YAML：
   - 新插件使用 `override: false`。
   - 已有插件使用 `override: true`；导入接口根据 `author` 和 `name` 定位并覆盖已有记录。
5. 不使用 `/sys/plugin/add` 或 `/sys/plugin/update` 保存插件，避免保存路径分叉、字段丢失和 Windows 请求兼容性问题。
6. 保存完成后重新调用 `/scoped/sys/ai/plugin/find` 或 `/scoped/sys/ai/plugin/info` 验证结果。

`/scoped/sys/ai/plugin/find` 会在一次请求中分别查询内置插件和 `store` 插件，再合并返回；`store` 插件需按上述字段区分市场插件与本地插件。

详细请求字段见 `references/certd-api.md`。

## Access 协作

开发 Task 或 DNS Provider 前，先用 `/scoped/sys/ai/plugin/find` 查询对应 Access：

1. 如果没有对应 Access，先创建 Access 插件，再创建业务插件。
2. 如果已有 Access，先读取它的完整 YAML 和 `content`。
3. 如果 Access 已提供所需 API/SDK，业务插件优先复用。
4. 如果缺少能力：
   - `editable: true`：优先修改 Access，并先保存历史。
   - `editable: false`：在当前业务插件中实现必要的 API 调用。
5. 业务插件通过 `dependPlugins` 声明 Access 依赖。

详细规则见 `references/access-development.md`。

## 本地历史

开发插件时，必须在当前工作区创建并使用 `.tmp/online-plugin-dev/` 作为临时目录。历史记录、临时 YAML、脚本草稿和调试记录都放在该目录下。

每次修改插件前，必须将完整 YAML 保存到 `.tmp/online-plugin-dev/history/`：

```text
.tmp/online-plugin-dev/
  history/
    plugin-12/
      2026-08-02T12-30-00-before-edit.yaml
      2026-08-02T12-30-00-change.md
```

保存要求：

- 修改前保存完整 YAML。
- 修改后保存修改摘要。
- 恢复前再次备份当前版本。
- 不上传历史文件，不保存 Token、证书、私钥或真实授权值。

详细格式见 `references/local-history.md`。

## YAML 和脚本规范

插件始终以完整 YAML 传递和保存，脚本源码放在顶层 `content` 字段。

- 统一使用 `await _ctx.import(...)` 引用模块。
- `"/@/..."` 表示以绝对路径引用 `server/src/` 下的模块。
- 最后返回继承目标基类的 class。
- 不使用 `import`、`export`、装饰器或独立源码文件语法。
- 使用 `this.logger` 打印插件执行日志。
- 使用 `this.ctx.http` 访问 HTTP 能力。
- 失败时抛出 `Error`。

需要字段格式时读取 `references/online-yaml-format.md`。
需要组件示例时读取 `references/component-examples.md`。

## 示例插件

开发对应类型插件前，先读取 `examples/` 下的示例：

- Access：`examples/DemoAccess.yaml`
- 部署/Task：`examples/DemoDeploy.yaml`
- DNS Provider：`examples/DemoDnsProvider.yaml`

示例是完整在线插件 YAML，重点参考 `input` 配置、依赖声明和 `content` 脚本结构。

## 子 Skill

- Task：`skills/task-plugin-dev/SKILL.md`
- DNS Provider：`skills/dns-provider-dev/SKILL.md`
- Access：`skills/access-plugin-dev/SKILL.md`

## 安全边界

Certd 会保存证书、私钥、API Token、云厂商密钥、SSH 凭据和其他敏感授权。

- 禁止读取、打印或上传真实授权值。
- 禁止把认证 Token 写入插件、历史、日志或摘要。
- 禁止读取无关的证书、私钥、Cookie、环境变量和系统设置。
- 只使用脱敏示例数据和公开文档。
- 不要自动发布；保存、测试、审核和发布由用户确认。
