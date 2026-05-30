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

`packages/pro/` 是独立 Git 工作区，使用 `packages/pro/.git` 管理。根仓库的 `git status` / `git diff` 默认看不到这里的实际改动；修改商业版代码后，要在 `packages/pro` 目录内单独执行 `git status` / `git diff` 检查。

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
- 不要运行前端 `pnpm tsc` / `vue-tsc`：当前依赖组合中 `vue-tsc@1.8.27` 会直接抛内部错误 `Search string not found: "/supportedTSExtensions = .*(?=;)/"`，不是有效的项目类型检查结果。
- 前端暂不跑单元测试；当前 `test:unit` 只是占位脚本

前端列表管理页面约定：

- 列表管理、后台管理、记录查询、CRUD 表格类页面，默认优先使用 Fast Crud（`@fast-crud/fast-crud`、`fs-crud`、`useFs`、`createCrudOptions`）实现。
- 只有轻量只读展示、强交互自定义界面或已有页面模式明确不适合 Fast Crud 时，才手写 `a-table` / 自定义列表，并在回复中说明原因。
- 开发或重构这类页面前，先读取 `.trae/skills/fast-crud-page-dev/SKILL.md`，按仓库内 Fast Crud 页面拆分与验证方式实现。
- 前端对话框里只做纯确认时可以使用 `Modal.confirm`；只要对话框里有字段输入、表单校验或提交字段，统一使用 `useFormDialog` / `openFormDialog`，不要在 `Modal.confirm` 的 `content` 里手写输入框。
- 页面内嵌 Fast Crud 表格时，要显式给外层容器稳定高度或 `flex: 1; min-height: 0` 的撑满链路；Fast Crud 依赖外部元素高度，不能只依赖表格默认高度。
- 后台管理列表里展示或筛选用户字段时，优先参考 `packages/ui/certd-client/src/views/sys/suite/user-suite/crud.tsx` 的 `userId` 字段模式：前端使用 `table-select` + `/sys/authority/user/getSimpleUserByIds` 字典回显和搜索；不要为了展示用户名让后端列表接口额外 `fillSimpleUser` / `userDisplay`，除非该接口本身就是用户端业务列表且已有明确模式。

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

### ACME / EAB 注意事项

- 公共 EAB（尤其是 Google EAB）可能只能创建一次 ACME 账号。要跨用户复用公共 EAB，应保存并复用同一个 ACME account private key；`accountUrl` 如果存到 `userContext` 里，只能视为当前用户缓存，因为 `userContext` 跟用户 id 走。
- ACME 协议的 `newAccount` 支持 `onlyReturnExisting`。使用同一个 account private key 调用 `newAccount({ onlyReturnExisting: true })` 可以取回已创建账号的 URL，且不会再次消费 EAB。
- 修改 EAB 的 `kid` 后，应重新生成绑定该 `kid` 的 account private key；否则应阻止继续申请并提示用户刷新账号私钥。

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
- 使用 `/basic/file/upload` 上传文件后，接口返回的是临时缓存 key。业务保存表单或设置时，后端必须调用 `FileService.saveFile(userId, key, "public" | "private")` 转成永久文件 key 后再入库/入设置；不要直接保存 `tmpfile_key_...`，否则后续回显或下载会失效。
- 本仓库代码注释优先使用中文，尤其是解释业务规则、兼容逻辑、协议细节和隐藏风险时；除非文件已有明确英文注释风格或引用外部英文术语，否则不要新增英文说明性注释。
- 代码可读性优先于短写法。遇到包含业务分支的复杂三元表达式、内联对象、链式调用或条件组合时，优先拆成命名清晰的中间变量、独立分支或小函数，让读代码的人能一眼看出业务意图；不要为了少写几行把逻辑压成难读的一坨。
- 遵守 DRY 原则：同一业务规则、字段转换、权限判断、Repository 选择、事务传播、金额计算等逻辑不要在多个地方复制粘贴。第二次出现时可以先保持清晰，第三次出现前应优先抽成局部 helper、service 方法或已有公共工具；抽象要服务于减少真实重复和降低修改风险，不要为了形式上的“复用”制造过度设计。
- 遵守单一职责原则：一个方法只负责一个清晰的业务步骤或技术步骤。流程编排方法可以串联多个步骤，但具体的校验、计算、持久化、状态变更、展示数据组装应尽量拆到命名明确的小方法中；不要让一个方法同时承担查询、校验、计算、写库、格式化返回等过多职责。
- 后端方法参数超过 3 个时，尽量改为对象参数传入；需要传入 `manager` / `EntityManager` 做事务传播的方法，必须使用对象参数，不要把 `manager` 作为位置参数藏在参数列表末尾。
- 后端 service 层只有存在事务链路传播需求时才定义 `ctx`，不要为了将来可能需要而提前给普通方法加 `ctx`。事务链路方法统一采用 `method(ctx, req)` 形式，`ctx` 放第一位并承载 `manager?: EntityManager` 等横切上下文，业务参数放在 `req` 对象里，例如 `settleCommission({ manager }, { tradeId, userId, amount })`。无事务链路需求的普通查询、纯函数和简单私有方法继续使用明确参数。
- service 内部需要根据事务上下文选择 Repository 时，优先使用 `BaseService.getRepo(ctx, EntityClass)`；不要在业务方法里反复写 `ctx.manager?.getRepository(Entity) || this.xxxRepository`。拿到 repo 后 save/update/delete/find 都能做，不需要再包一层 `saveEntity` 之类的单一用途方法。`ctx` 类型统一从 `BaseService` 导出的 `ServiceContext` 复用，不要在每个 service 里重复定义。

- 需要"有事务则复用、无事务则开启"时，使用 `BaseService.transactionWithCtx(ctx, callback)`：ctx.manager 存在则直接执行 callback，否则自动 `this.transaction()`。不要在业务代码里手写 `if (ctx.manager) { ... } else { await this.transaction(...) }`。

- 新增方法注意不要与 `BaseService` 基类方法签名冲突（如 `delete(id)` vs `BaseService.delete(ids, where?)`），ts-node 下会直接 TS2416 编译报错。冲突时改用具体名称如 `deleteById`。

## 插件开发技能

仓库内置了 Certd 插件开发技能，供 Trae 和 Codex 共用：

- Trae 入口：`.trae/skills`
- Codex 入口：`.codex/skills`

其中 `.codex/skills` 是指向 `.trae/skills` 的目录链接，不要复制出第二份技能内容。更新技能时只维护 `.trae/skills` 下的原始文件，Codex 会通过 `.codex/skills` 读取同一份内容。

当前技能包括：

- `access-plugin-dev`：开发 Access 授权插件
- `dns-provider-dev`：开发 DNS Provider 插件
- `fast-crud-page-dev`：开发或重构前端 Fast Crud 列表管理页面
- `task-plugin-dev`：开发 Task 部署任务插件
- `plugin-converter`：将插件转换为 YAML 配置

做插件相关任务时，先读取对应技能目录下的 `SKILL.md`，再进入具体实现。若用户在插件开发中指出更好的做法，应总结并更新对应技能。

## 快速定向命令

进入项目后，优先使用这些有目标的读取命令，而不是立刻全仓库扫描：

```powershell
Get-Content -Encoding utf8 package.json
Get-Content -Encoding utf8 pnpm-workspace.yaml
Get-Content -Encoding utf8 lerna.json
Get-Content -Encoding utf8 README_en.md -TotalCount 180
Get-Content -Encoding utf8 packages\ui\certd-server\package.json
Get-Content -Encoding utf8 packages\ui\certd-client\package.json
Get-ChildItem packages\ui\certd-server\src\modules
Get-ChildItem packages\ui\certd-server\src\plugins
Get-ChildItem packages\ui\certd-client\src\views\certd
```

## 本仓库 Agent 工作方式

- 先读本文件，再按用户任务查看相关 package/module。
- 在 PowerShell 中读取中文、Markdown、locale、文档类文件时，显式使用 `Get-Content -Encoding utf8`；如果仍然显示乱码，再先执行 `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()` 后重试。
- 做后端任务时，先定位 `packages/ui/certd-server/src/modules` 下的模块，以及相关 entity/service/controller。
- 做前端任务时，先定位 `packages/ui/certd-client/src/views/certd` 下的页面，再找对应 `src/api`。
- 做服务商、DNS、部署、通知相关任务时，先看 `packages/ui/certd-server/src/plugins`，再看 `packages/plugins/plugin-lib` 里的共享辅助能力。
- 做数据库结构变更时，添加或更新迁移脚本，不要依赖 TypeORM 自动同步。
- 实现新功能或修复行为缺陷前，先补对应单元测试，并先运行测试确认它处于失败状态；再实现功能或修复代码，反复运行聚焦单元测试直到通过。若某项改动确实不适合先写单元测试，应在回复中说明原因和替代验证方式。
- 后补单元测试时，应先基于对正确行为的实际预期编写测试，而不是为了迎合现有实现改写预期；如果运行后出现红灯，且通过测试需要修改已有实现，应先向用户确认这是确实的 bug，还是原本需求/既有行为就是如此；确认后再修改原始实现，避免把测试补充变成未经确认的行为改动。
- 后端纯单元测试用例放在 `src` 目录内，并尽量与被测文件相邻，例如 `src/utils/random.test.ts`；对应 `test:unit` 只跑 `src/**/*.test.ts`，构建/打包配置应排除这些 `*.test.ts` 文件。
- 单元测试需要 mock ESM 静态 import 时，优先使用 `esmock`，不要为了测试把业务代码改成构造函数注入或把逻辑挪到调用方；各包 `test:unit` 脚本应显式设置 `NODE_ENV=unittest`。
- 单个 monorepo 包运行单元测试时，优先使用 `corepack pnpm --dir <包目录> test:unit`，例如 `corepack pnpm --dir packages\ui\certd-server test:unit`、`corepack pnpm --dir packages\core\basic test:unit`、`corepack pnpm --dir packages\plugins\plugin-lib test:unit`；也可以用包名过滤，例如 `corepack pnpm --filter @certd/ui-server test:unit`。前端 `packages\ui\certd-client` 暂时不跑单元测试。
- 前端 TS/Vue/locale 等文件改动后，优先只对本次改动文件运行项目现有自动格式化/修复；Windows/PowerShell 下 Prettier 已验证可用命令为 `packages\ui\certd-client\node_modules\.bin\prettier.cmd --write <files>`，ESLint 可用命令为 `packages\ui\certd-client\node_modules\.bin\eslint.cmd --fix <files>`；不要运行 `vue-tsc` / `pnpm tsc`；不要为了格式化无关文件而扩大 diff。项目保留了 `tslint` 依赖，但当前主要使用 ESLint + Prettier。
- 优先对改动包运行聚焦的测试；后端可按包运行单元测试，前端优先使用 Prettier/ESLint 做改动文件验证。只有跨包影响明显时再考虑全 monorepo 构建。

- 不要主动运行 `pnpm install` 安装依赖：用户会事先准备好 `node_modules`。如果 `pnpm install` 或 `test:unit` 因缺少依赖、TTY 或网络问题失败，立即停止尝试，告知用户解决环境问题。
