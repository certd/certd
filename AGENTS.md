# Certd 开发 Agent 上下文

这个文件是给在本仓库工作的开发 agent 看的常驻项目说明。进入仓库后先读本文，再按任务读取对应导航或规则文件，避免每次重新全量扫描项目。

仓库代码导航、目录地图、常用入口和参考文件见 `.codex/repo-map.md`。更细的开发规则拆在 `.codex/agent-rules/` 下；本文只保留最高优先级的规则、架构边界和工作方式。

## 项目定位

Certd 是支持私有化部署的 SSL/TLS 证书自动化管理平台，提供 Web 管理台和后端服务，用于证书申请、续期、部署、监控、通知和开放 API 集成。

核心产品模型是“证书流水线”：

- 通过 ACME 申请证书
- 使用 DNS-01、HTTP-01、CNAME 代理或服务商集成完成域名验证
- 将证书转换或导出为 pem、pfx、der、jks、p7b 等格式
- 部署证书到主机、Nginx、Kubernetes、CDN、云厂商、面板等目标
- 通知用户，并监控站点证书过期时间

系统会保存证书、云厂商凭据、SSH 信息、API Key 等敏感数据，始终按私有化/本地部署产品处理，避免泄露本地数据和配置。

## 必读索引

- `.codex/repo-map.md`：仓库结构、后端/前端入口、流水线与插件地图、验证命令
- `.codex/agent-rules/backend.md`：后端、数据库迁移、文件上传、service/事务约定
- `.codex/agent-rules/frontend.md`：前端、Fast Crud、弹窗表单、格式化和禁跑命令
- `.codex/agent-rules/plugins.md`：流水线、插件归属、ACME/EAB、插件开发技能
- `.codex/agent-rules/testing.md`：测试优先策略、单测位置、ESM mock、聚焦验证
- `.codex/agent-rules/coding-style.md`：注释、可读性、DRY、单一职责等通用代码风格

## 仓库边界

这是一个 pnpm + lerna 的 monorepo。核心定位：

- `packages/ui/certd-server`：后端服务
- `packages/ui/certd-client`：前端 Web 管理台
- `packages/core/pipeline`：流水线核心
- `packages/core/acme-client`：ACME 协议客户端
- `packages/plugins/plugin-lib`：通用插件辅助能力和证书相关共享代码

`packages/pro/` 是独立 Git 工作区，使用 `packages/pro/.git` 管理。根仓库的 `git status` / `git diff` 默认看不到这里的实际改动；修改商业版代码后，要在 `packages/pro` 目录内单独执行 `git status` / `git diff` 检查。

## 硬性规则

- 根包管理器是 pnpm，不要引入 npm/yarn lockfile。
- 不要主动运行 `pnpm install`；用户会事先准备好 `node_modules`。如果 `pnpm install` 或测试因缺少依赖、TTY、网络问题失败，停止尝试并告知用户环境问题。
- 前端不要运行 `pnpm tsc` / `vue-tsc`；当前依赖组合中 `vue-tsc@1.8.27` 会抛无效内部错误。前端 `test:unit` 只是占位脚本。
- 不要把 `packages/ui/certd-server/data/`、`logs/`、生成的 metadata/dist 等运行时或构建产物纳入改动，除非任务明确要求。
- 做数据库结构变更时，添加或更新迁移脚本，不要依赖 TypeORM 自动同步。
- 做插件相关任务时，先读取对应 `.trae/skills/<skill>/SKILL.md`，再进入具体实现。

## 工作方式

- 先读本文；需要代码导航、目录入口、参考文件或验证命令时读 `.codex/repo-map.md`。
- 任务涉及后端、前端、插件、测试或代码风格时，先读取 `.codex/agent-rules/` 下对应规则文件，再查看具体代码。
- 在 PowerShell 中读取中文、Markdown、locale、文档类文件时，显式使用 `Get-Content -Encoding utf8`；如果仍乱码，再执行 `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()` 后重试。
- 做后端任务时，先定位 `packages/ui/certd-server/src/modules` 下的模块，以及相关 entity/service/controller。
- 做前端任务时，先定位 `packages/ui/certd-client/src/views/certd` 下的页面，再找对应 `src/api`。
- 做服务商、DNS、部署、通知相关任务时，先看 `packages/ui/certd-server/src/plugins`，再看 `packages/plugins/plugin-lib` 里的共享辅助能力。
- 优先沿用现有模块、插件、服务模式，再考虑新增抽象；避免为了形式上的“复用”制造过度设计。
- 实现新功能或修复行为缺陷前，优先补对应单元测试并确认红灯，再实现代码并跑聚焦验证。确实不适合先写测试时，在回复中说明原因和替代验证方式。
- 后补单元测试时，先按正确行为写预期；如果红灯需要修改既有实现，先向用户确认这是 bug 还是既有需求，避免未经确认改变行为。
- 优先对改动包运行聚焦测试或格式化/ESLint；只有跨包影响明显时再考虑更大范围构建。

## 架构边界

插件是核心能力，不是边缘功能。新增服务商、DNS 验证、证书部署、通知方式等能力，通常应该放在插件包里，或放在 `packages/ui/certd-server/src/plugins/<plugin-name>/` 下。

修改证书申请、验证、部署或通知行为时，先判断改动属于 ACME client、pipeline 核心抽象、后端 module/service/entity/controller、具体插件实现，还是前端 view/form/schema。

如果只是某个服务商或部署目标的问题，不要轻易修改共享 pipeline/core 行为，除非确实是可复用的公共能力。
