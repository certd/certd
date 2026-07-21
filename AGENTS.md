# Certd 开发 Agent 上下文

进入仓库后先读本文。本文同时包含常驻规则、仓库地图、常用入口和验证命令；不要依赖分散规则文件。
思考时也要使用中文。

## 项目定位

Certd 是可私有化部署的 SSL/TLS 证书自动化管理平台，提供 Web 管理台和后端服务，用于证书申请、续期、部署、监控、通知和开放 API 集成。

核心模型是“证书流水线”：

- 通过 ACME 申请证书。
- 完成 DNS-01、HTTP-01、CNAME 代理或服务商验证。
- 导出 pem、pfx、der、jks、p7b 等证书格式。
- 部署到主机、Nginx、Kubernetes、CDN、云厂商、面板等目标。
- 通知用户，并监控站点证书过期时间。

系统会保存证书、云厂商凭据、SSH 信息、API Key 等敏感数据。始终按私有化/本地部署产品处理，避免泄露本地数据和配置。

## 仓库边界

- 根仓库是 pnpm + lerna monorepo；不要引入 npm/yarn lockfile。
- `packages/pro/` 是独立 Git 工作区；修改商业版代码后，必须在 `packages/pro` 内单独执行 `git status` / `git diff`。
- 不要把 `packages/ui/certd-server/data/`、`logs/`、生成的 metadata/dist 等运行时或构建产物纳入改动，除非任务明确要求。
- 例外：分析插件动态依赖时，可以只读查看后端数据目录下的 `./data/.runtime-deps`；该目录用于 runtime-deps 动态安装第三方 SDK，不应纳入提交。

核心包：

- `packages/ui/certd-server`：后端服务。
- `packages/ui/certd-client`：前端 Web 管理台。
- `packages/core/pipeline`：流水线核心。
- `packages/core/acme-client`：ACME 客户端。
- `packages/plugins/plugin-lib`：插件共享能力。

## 仓库地图

- `package.json`：根脚本与 workspace 元信息。
- `pnpm-workspace.yaml`：workspace 匹配规则，包含 `packages/**`、`packages/ui/**`。
- `lerna.json`：lerna-lite 配置。
- `docs`：VitePress 文档站。
- `docker`：Docker 安装和运行相关文件。
- `packages/core/acme-client`：ACME 协议客户端。
- `packages/core/basic`：共享基础工具。
- `packages/core/pipeline`：流水线核心抽象、插件模型、执行上下文。
- `packages/libs`：共享集成库。
- `packages/plugins/plugin-lib`：证书、DNS Provider、格式转换等插件共享能力。
- `packages/plugins/plugin-cert`：证书插件包入口。
- `packages/ui/certd-server`：后端 Midway 服务。
- `packages/ui/certd-client`：前端 Vue/Vite 管理台。
- `packages/pro`：商业版独立 Git 工作区，需在该目录内单独检查状态。

常见运行时或生成产物：

- 根目录：`node_modules`、`logs`、`output`、`lerna-debug.log`、`tmp-certd-client-vite*.log`。
- 后端：`packages/ui/certd-server/data`、`packages/ui/certd-server/logs`。
- 后端动态依赖：`./data/.runtime-deps`，常见于阿里云 SDK、腾讯云 SDK 等插件第三方依赖。
- 各包：`dist`。
- 插件：metadata/yaml 导出结果。

## 常用验证

- 前端改动文件格式化：`packages\ui\certd-client\node_modules\.bin\prettier.cmd --write <files>`。
- 前端改动文件 ESLint 修复：`packages\ui\certd-client\node_modules\.bin\eslint.cmd --fix <files>`。
- 后端单元测试：`cd packages\ui\certd-server && npm run unit`。
- 后端改动文件 lint fix：`cd packages\ui\certd-server && npm run lint`。
- 其他package lint fix：`cd packages\xxx\xxxx && npm run lint`。

## 通用工作规则

- 先读本文，再按任务读取具体代码或技能文件。
- PowerShell 读取中文、Markdown、locale、文档类文件时使用 `Get-Content -Raw -Encoding UTF8`；仍乱码时先执行 `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()`。
- PowerShell 中用 `rg` 搜索含引号、括号、反斜杠的 pattern 时，优先用单引号包裹整个 pattern，例如 `rg 'await import\("tencentcloud-sdk-nodejs' packages/ui/certd-server/src -g '*.ts'`。
- 手工编辑或创建文件时优先使用 `apply_patch`。单个文件内有多处不连续改动时，拆成多个独立的 `*** Update File` 块，每块只改一处附近上下文；不要在同一个 update hunk 里强塞多个 `@@`。
- 只有真正机械化的大批量替换、格式化或生成任务才考虑脚本/工具。若必须使用临时脚本，应放在临时目录并在同一个受控步骤内完成创建、执行、删除；不要把临时脚本落在仓库里跨多步工具调用执行。
- 不要主动运行 `pnpm install`；缺依赖、TTY、网络导致安装或测试失败时，停止尝试并说明环境问题。
- 优先沿用现有模块、插件、service、页面模式；不要为形式上的复用制造过度抽象。
- 代码可读性优先于短写法。复杂条件、三元表达式、链式调用、内联对象和多层 helper 调用要拆成命名清晰的中间变量或小方法。
- 方法调用链不要直接塞进另一个方法参数；先用有意义的局部变量承接返回值，再传入下一步。
- 注释优先使用中文，尤其是业务规则、兼容逻辑、协议细节和隐藏风险；文件已有英文风格或引用外部术语时可保持一致。
- 遵守 DRY 和单一职责；第三次出现的业务规则、字段转换、权限判断、Repository 选择、事务传播、金额计算等逻辑，应优先抽成合适 helper 或 service 方法。


## 测试与验证

- 务必写单元测试，覆盖主要业务逻辑。
- 实现新功能或修复行为缺陷前，优先补单元测试并先确认红灯，再实现并跑聚焦验证。
- 确实不适合先写测试时，在回复中说明原因和替代验证方式。
- 后补单元测试时，按正确行为写预期；若红灯需要修改既有实现，先向用户确认这是 bug 还是既有需求，避免未经确认改变行为。
- 后端纯单测放在 `src/**/*.test.ts`，尽量与被测文件相邻；`test:unit` 只跑这些文件，构建/打包应排除 `*.test.ts`。
- 单测需要 mock ESM 静态 import 时，优先使用 `esmock`，不要为了测试改业务代码结构。
- 各包 `test:unit` 脚本应显式设置 `NODE_ENV=unittest`。
- 单包单测优先用 `cd <包目录> && npm run test:unit`，例如 `cd packages\ui\certd-server && npm run test:unit`。
- 优先对改动包运行聚焦测试或格式化/ESLint；只有跨包影响明显时再考虑更大范围构建。


## 后端规则

- 后端主包是 `packages/ui/certd-server`，使用 Node.js、ESM、TypeScript、MidwayJS 3、Koa、TypeORM 和 SQL 迁移。
- 做后端任务时，先定位 `packages/ui/certd-server/src/modules` 下的模块，以及相关 entity/service/controller。
- 表结构变更必须添加或更新 `packages/ui/certd-server/db/migration/*.sql`；不要依赖 TypeORM 自动同步。
- 文件上传接口 `/basic/file/upload` 返回临时 key；业务保存前必须调用 `FileService.saveFile(userId, key, "public" | "private")` 转成永久 key，不能直接保存 `tmpfile_key_...`。
- 方法参数超过 3 个时，优先改为对象参数。
- 事务链路方法统一用 `method(ctx, req)`，`ctx` 放第一位并承载 `manager?: EntityManager`，业务参数放 `req` 对象。
- 只有需要事务传播时才定义 `ctx`；普通查询、纯函数和简单私有方法继续使用明确参数。
- 需要按事务上下文取 Repository 时，用 `BaseService.getRepo(ctx, EntityClass)`。
- 需要“有事务则复用、无事务则开启”时，用 `BaseService.transactionWithCtx(ctx, callback)`。
- 拼接可选 `projectId` 查询条件时，**必须**使用 `BaseService.buildUserProjectQuery(userId, projectId)`，禁止直接写 `{ userId, projectId }`。因为 `projectId` 可能为 `null`/`undefined`，直接放入查询会生成错误的 `WHERE projectId = NULL` 条件。
- `ctx` 类型复用 `BaseService` 导出的 `ServiceContext`。
- 新增 service 方法避免与 `BaseService` 方法签名冲突，例如不要用 `delete(id)` 覆盖 `delete(ids, where?)`；改用 `deleteById` 等具体名称。

### 后端地图

- `packages/ui/certd-server/bootstrap.js`：Midway 启动入口，使用 `@midwayjs/bootstrap`。
- `packages/ui/certd-server/src/configuration.ts`：Midway 主配置，注册组件和全局中间件。
- `packages/ui/certd-server/src/config/config.default.ts`：端口、HTTPS、静态文件、cron、TypeORM、Flyway、上传、JWT、Swagger 默认配置。
- `packages/ui/certd-server/src/config/loader.ts`：读取 `.env`、`.env.<env>.yaml`，支持 `certd_` 前缀环境变量覆盖嵌套配置。
- `packages/ui/certd-server/src/modules`：业务模块根目录，常见模块包括：
  - `basic`
  - `cert`
  - `cname`
  - `cron`
  - `login`
  - `monitor`
  - `open`
  - `pipeline`
  - `plugin`
  - `suite`
  - `sys`
- `packages/ui/certd-server/src/controller`：API 入口，按 `basic`、`user`、`sys`、`openapi` 分组。
- `packages/ui/certd-server/db/migration`：SQL 迁移目录；TypeORM `synchronize: false`，表结构变更必须配套迁移 SQL。
- 后端测试使用 Mocha + Node `assert/strict`；纯单测放在 `src/**/*.test.ts`，可参考 `src/utils/random.test.ts`、`src/controller/basic/app-controller.test.ts`、`src/modules/pipeline/service/pipeline-service.test.ts`。

## 前端规则

- 前端主包是 `packages/ui/certd-client`，使用 Vue 3、Vite、TypeScript、Ant Design Vue、Fast Crud、Pinia、vue-router、vue-i18n。
- 做前端任务时，先定位 `packages/ui/certd-client/src/views/certd` 下的页面，再找对应 `src/api`。
- 不要运行前端 `pnpm tsc` / `vue-tsc`；当前 `vue-tsc@1.8.27` 会抛无效内部错误。前端 `test:unit` 只是占位脚本，也不要跑。
- 前端 TS/Vue/locale 改动后，只对本次改动文件运行现有 Prettier / ESLint：`packages\ui\certd-client\node_modules\.bin\prettier.cmd --write <files>` 和 `packages\ui\certd-client\node_modules\.bin\eslint.cmd --fix <files>`。
- 列表管理、后台管理、记录查询、CRUD 表格页面优先使用 Fast Crud；开发或重构前读 `.trae/skills/fast-crud-page-dev/SKILL.md`。
- 只有轻量只读展示、强交互自定义界面或既有页面模式明显不适合 Fast Crud 时，才手写 `a-table` / 自定义列表，并在回复中说明。
- 内嵌 Fast Crud 时，外层必须有稳定高度或完整 `flex: 1; min-height: 0` 链路。
- 后台管理列表展示或筛选用户字段时，优先参考 `packages/ui/certd-client/src/views/sys/suite/user-suite/crud.tsx` 的 `userId` 字段模式，用 `table-select` + `/sys/authority/user/getSimpleUserByIds` 字典回显和搜索。
- 对话框里只做确认可用 `Modal.confirm`；有字段输入、表单校验或提交字段时，必须用 `useFormDialog` / `openFormDialog`。

### 前端地图

- `packages/ui/certd-client/vite.config.ts`：Vite 配置。
  - dev 端口：`3008`
  - 代理路径：`/api`、`/certd/api`
  - 代理目标：`127.0.0.1:7001`
- `packages/ui/certd-client/src/main.ts`：Vue 启动入口，注册 AntDV、Vben、router、全局组件、插件和偏好设置。
- `packages/ui/certd-client/src/App.vue`：根组件，包含 `AConfigProvider`、`FsFormProvider`、`router-view`。
- `packages/ui/certd-client/src/router/index.ts`、`src/router/resolve.ts`：路由入口，使用 `createWebHashHistory`。
- `packages/ui/certd-client/src/router/source/modules/certd.ts`：Certd 主业务路由。
- `packages/ui/certd-client/src/store`：Pinia store，主要包括：
  - `user`
  - `project`
  - `settings`
  - `plugin`
- `packages/ui/certd-client/src/api/service.ts`：Axios 封装。
- `packages/ui/certd-client/src/api/tools.ts`：错误与响应工具。
- `packages/ui/certd-client/src/views/certd`：核心业务视图，常见目录包括：
  - `pipeline`
  - `cert`
  - `monitor`
  - `access`
  - `notification`
  - `open`
  - `project`
  - `suite`
  - `wallet`
- `packages/ui/certd-client/src/locales`：国际化入口与语言包。
- Fast Crud 页面常见拆分是 `api.ts`、`crud.tsx`、`index.vue`；可参考 `src/views/certd/access`、`src/views/sys/suite/user-suite/crud.tsx`、`src/views/certd/wallet/index.vue`。

## 流水线与插件规则

- 插件是核心能力。新增服务商、DNS 验证、证书部署、通知方式，通常放到插件包或 `packages/ui/certd-server/src/plugins/<plugin-name>/`。
- 做服务商、DNS、部署、通知相关任务时，先看 `packages/ui/certd-server/src/plugins`，再看 `packages/plugins/plugin-lib`。
- 插件依赖的第三方 SDK 可能通过 runtime-deps 动态安装到后端运行目录 `./data/.runtime-deps`。分析阿里云、腾讯云等 SDK 行为时，需要进入该目录阅读实际安装版本代码。
- 修改证书申请、验证、部署或通知行为时，先判断归属：ACME client、pipeline 核心、后端 module/service/entity/controller、具体插件、前端 view/form/schema。
- 单个服务商或部署目标的问题，不要轻易修改共享 pipeline/core；只有可复用公共语义或跨插件一致行为才上移到 `packages/core/pipeline` 或 `packages/plugins/plugin-lib`。
- `newAccount({ onlyReturnExisting: true })` 可用同一个 account private key 取回已创建账号 URL，且不会再次消费 EAB。
- 修改 EAB `kid` 后，应重新生成绑定该 `kid` 的 account private key；否则应阻止继续申请并提示刷新账号私钥。
- 插件开发前先读对应技能：`.trae/skills/dns-provider-dev/SKILL.md`、`.trae/skills/task-plugin-dev/SKILL.md`、`.trae/skills/access-plugin-dev/SKILL.md`、`.trae/skills/plugin-converter/SKILL.md`。
- `.codex/skills` 是指向 `.trae/skills` 的目录链接；更新技能只维护 `.trae/skills`，不要复制第二份。

### 流水线与插件地图

- `packages/core/pipeline/src/index.ts`：核心导出入口，导出 `core`、`dt`、`access`、`registry`、`plugin`、`context`、`decorator`、`service`、`notification`。
- `packages/core/pipeline/src/plugin`：任务插件抽象，主要包括：
  - `AbstractTaskPlugin`
  - `IsTaskPlugin`
  - `TaskInput`
  - `pluginRegistry`
- `packages/core/pipeline/src/access`：授权插件抽象，主要包括：
  - `BaseAccess`
  - `IsAccess`
  - `AccessInput`
  - `accessRegistry`
- `packages/core/pipeline/src/dt/pipeline.ts`：`Pipeline`、`Stage`、`Task`、`RunStrategy` 等流水线数据结构。
- `packages/core/pipeline/src/core`：执行器、上下文、运行历史、文件存储等。
- `packages/core/pipeline/src/service`：CNAME、事件、配置、邮件、URL 等 pipeline service 接口。
- `packages/ui/certd-server/src/plugins`：后端内置服务商、DNS、部署、通知等插件。
- `packages/ui/certd-server/src/plugins/plugin-cert`：证书申请核心插件。
- `packages/ui/certd-server/src/plugins/plugin-lib`：后端插件 helper/access。
- `packages/plugins/plugin-lib/src/cert`：`CertReader`、`CertConverter`、DNS Provider 公共能力。
- `packages/plugins/plugin-lib/src/cert/dns-provider`：`AbstractDnsProvider`、`dnsProviderRegistry`、`DomainParser`。
- ACME 协议、EAB、账号、订单、挑战流程：优先看 `packages/core/acme-client` 或 `packages/ui/certd-server/src/plugins/plugin-cert/plugin/cert-plugin/acme.ts`。
- 流水线执行、任务生命周期、输入输出、注册机制：看 `packages/core/pipeline`。
- 单个云厂商 DNS 验证、证书部署、API 调用失败：改对应 `packages/ui/certd-server/src/plugins/plugin-xxx`。
- 通用证书读取、DNS Provider 公共能力、格式转换：改 `packages/plugins/plugin-lib`。
- 后端业务数据、接口、实体、权限、迁移：改 `packages/ui/certd-server/src/modules` 与 `src/controller`。
- 表单、列表、插件配置 UI：改 `packages/ui/certd-client/src/views/certd` 及对应 `src/api`。

## 其他注意事项

### 旧版数据兼容

- 新增插件参数时，必须要考虑旧版数据兼容，比如新增一个deployType参数，有两种值：`default`和`custom`，需要在使用时判空，走旧版逻辑。
