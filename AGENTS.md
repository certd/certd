# Certd 开发 Agent 上下文

这个文件是给在本仓库工作的开发 agent 看的常驻项目说明。后续会话进入仓库后，应先读取它，再按任务需要查看具体代码，避免每次都重新全量扫描项目。

## 项目用途

Certd 是一个支持私有化部署的 SSL/TLS 证书自动化管理平台。它提供 Web 管理台和后端服务，用于证书申请、续期、部署、监控、通知和开放 API 集成。

它不只是一个简单的 ACME 客户端。项目的核心产品模型是“证书流水线”：

- 通过 ACME 申请证书
- 支持 DNS-01、HTTP-01、CNAME 代理以及各类服务商集成来完成域名验证
- 支持将证书转换或导出为 pem、pfx、der、jks、p7b 等格式
- 支持把证书部署到主机、Nginx、Kubernetes、CDN、云厂商、面板等目标
- 支持通知用户，并监控站点证书过期时间

由于系统会保存证书、云厂商凭据、SSH 信息、API Key 等敏感数据，产品定位上强烈建议私有化/本地部署。

## 仓库结构

这是一个 pnpm + lerna 的 monorepo。

- `package.json`：根脚本和 workspace 元信息
- `pnpm-workspace.yaml`：workspace 包匹配规则
- `lerna.json`：lerna-lite 配置
- `docs/`：VitePress 文档站
- `docker/`：Docker 安装和运行相关文件
- `packages/core/acme-client/`：ACME 协议客户端，风格接近 node-acme-client
- `packages/core/basic/`：共享基础工具和基础设施
- `packages/core/pipeline/`：流水线核心、注册表、装饰器、插件模型、上下文、服务、通知等
- `packages/libs/`：共享集成与辅助库，例如 server、Huawei、JDCloud、Kubernetes、iframe
- `packages/plugins/plugin-lib/`：通用插件辅助能力和证书相关共享代码
- `packages/plugins/plugin-cert/`：证书流水线插件包
- `packages/pro/`：商业版/专业版相关包
- `packages/ui/certd-server/`：后端服务
- `packages/ui/certd-client/`：前端 Web 管理台

## 后端

主要后端包：`packages/ui/certd-server`。

技术栈：

- Node.js、ESM、TypeScript
- MidwayJS 3
- Koa
- TypeORM
- 默认使用 better-sqlite3，同时支持 PostgreSQL 和 MySQL
- 通过 `@certd/midway-flyway-js` 使用类似 Flyway 的 SQL 迁移机制

重要位置：

- `packages/ui/certd-server/src/config/config.default.ts`：默认服务、静态文件、数据库、定时任务、认证、上传、Swagger 配置
- `packages/ui/certd-server/src/config/`：环境与配置加载逻辑
- `packages/ui/certd-server/src/configuration.ts`：Midway 应用配置、中间件注册、组件导入
- `packages/ui/certd-server/src/modules/`：业务模块，例如 pipeline、cert、cron、monitor、login、open API、sys、plugin、cname、notification
- `packages/ui/certd-server/src/controller/`：按 API 领域划分的控制器
- `packages/ui/certd-server/src/plugins/`：后端内置的具体服务商、部署、通知等插件
- `packages/ui/certd-server/db/migration/`：数据库迁移 SQL
- `packages/ui/certd-server/data/`：本地运行数据，例如 SQLite 数据库和生成文件
- `packages/ui/certd-server/logs/`：运行日志

已观察到的默认开发配置：

- HTTP 端口：`7001`
- HTTPS 端口：`7002`
- 默认 SQLite 数据库：`./data/db.sqlite`
- 默认文件根目录：`./data/files`

常用脚本：

- 根目录 `pnpm run start:server`：以生产模式启动后端包
- 后端 `pnpm run dev`：启动 Midway watch/dev 服务
- 后端 `pnpm run test`：运行后端 mocha 测试
- 后端 `pnpm run build`：构建后端并导出插件元数据

## 前端

主要前端包：`packages/ui/certd-client`。

技术栈：

- Vue 3
- Vite
- TypeScript
- Ant Design Vue
- Fast Crud
- Pinia
- vue-router
- vue-i18n
- Tailwind/Windi 相关样式工具

重要位置：

- `packages/ui/certd-client/src/main.ts`：前端启动入口
- `packages/ui/certd-client/src/App.vue`：根组件
- `packages/ui/certd-client/src/api/`：API 调用封装
- `packages/ui/certd-client/src/router/`：路由
- `packages/ui/certd-client/src/store/`：Pinia store
- `packages/ui/certd-client/src/views/certd/`：核心产品页面，例如流水线、证书、授权、监控、通知、开放 API、项目、支付、插件
- `packages/ui/certd-client/src/components/`：共享 UI 组件
- `packages/ui/certd-client/src/locales/`：国际化

常用脚本：

- 前端 `pnpm dev`：启动 Vite 开发服务
- 前端 `pnpm build`：生产构建
- 前端 `pnpm tsc`：类型检查
- 前端 `pnpm test:unit`：Vitest 单元测试

## 流水线与插件模型

项目最关键的架构概念是证书流水线。

可以从 `packages/core/pipeline/src/index.ts` 入手，它导出：

- `core`
- `dt`
- `access`
- `registry`
- `plugin`
- `context`
- `decorator`
- `service`
- `notification`

插件是核心能力，不是边缘功能。新增服务商、DNS 验证、证书部署、通知方式等能力，通常应该放在插件包里，或放在 `packages/ui/certd-server/src/plugins/<plugin-name>/` 下。

后端已看到的插件类型包括：

- DNS 和注册商服务商：Aliyun、Tencent、Cloudflare、Huawei、JDCloud、AWS、Azure、Google、GoDaddy、Namesilo、Xinnet、West、UCloud、Qiniu、Upyun、Volcengine 等
- 部署目标：host、Kubernetes、Nginx Proxy Manager、APISIX、Proxmox、QNAP、Dokploy、GoEdge、各类 CDN、各类面板
- 系统/产品插件：notification、captcha、oauth、admin、plus/pro、demo/template

当修改证书申请、验证、部署或通知行为时，先判断改动属于哪里：

- ACME client 代码
- pipeline 核心抽象
- 后端 module/service/entity/controller
- 某个具体插件实现
- 前端 view/form/schema

如果只是某个服务商或部署目标的问题，不要轻易修改共享 pipeline/core 行为，除非确实是可复用的公共能力。

## 数据与迁移

后端使用 TypeORM 实体加 SQL 迁移。

重点查看：

- `packages/ui/certd-server/src/modules/**/entity/*.ts`
- `packages/ui/certd-server/db/migration/*.sql`

默认配置中 `synchronize: false`，所以涉及表结构变更时，通常应该添加或更新迁移脚本，而不是依赖 TypeORM 自动同步。

## 开发注意事项

- 中文 README 在部分 PowerShell 环境中可能显示乱码；`README_en.md` 可读性更好，且包含同样的高层项目说明。
- 初次整理时观察到当前分支为 `v2-dev`。
- 根包管理器是 pnpm，不要引入 npm/yarn lockfile。
- 优先沿用现有模块、插件、服务模式，再考虑新增抽象。
- `packages/ui/certd-server/data/`、`logs/`、生成的 metadata/dist 等通常视为运行时或构建产物，除非任务明确要求处理它们。
- 注意本地数据和配置里可能包含凭据、证书材料等敏感信息。

## 快速定向命令

进入项目后，优先使用这些有目标的读取命令，而不是立刻全仓库扫描：

```powershell
Get-Content package.json
Get-Content pnpm-workspace.yaml
Get-Content lerna.json
Get-Content README_en.md -TotalCount 180
Get-Content packages\ui\certd-server\package.json
Get-Content packages\ui\certd-client\package.json
Get-ChildItem packages\ui\certd-server\src\modules
Get-ChildItem packages\ui\certd-server\src\plugins
Get-ChildItem packages\ui\certd-client\src\views\certd
```

## 本仓库 Agent 工作方式

- 先读本文件，再按用户任务查看相关 package/module。
- 做后端任务时，先定位 `packages/ui/certd-server/src/modules` 下的模块，以及相关 entity/service/controller。
- 做前端任务时，先定位 `packages/ui/certd-client/src/views/certd` 下的页面，再找对应 `src/api`。
- 做服务商、DNS、部署、通知相关任务时，先看 `packages/ui/certd-server/src/plugins`，再看 `packages/plugins/plugin-lib` 里的共享辅助能力。
- 做数据库结构变更时，添加或更新迁移脚本，不要依赖 TypeORM 自动同步。
- 优先对改动包运行聚焦的测试或类型检查；只有跨包影响明显时再考虑全 monorepo 构建。
