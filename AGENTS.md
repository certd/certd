# Certd 开发 Agent 上下文

进入仓库先读本文，再按任务读取相关代码和技能。本文集中维护常驻规则、仓库入口和验证命令；思考与沟通使用中文，技术名词、标识符、第三方库名称和命令可保留英文。

## 1. 项目与仓库边界

Certd 是可私有化部署的 SSL/TLS 证书自动化管理平台。核心模型是证书流水线：通过 ACME 申请证书，完成 DNS-01、HTTP-01、CNAME 代理或服务商验证，导出 pem/pfx/der/jks/p7b 等格式，部署到主机、Nginx、Kubernetes、CDN、云厂商或面板，并执行通知和站点证书监控。

- 系统保存证书、云厂商凭据、SSH 信息和 API Key 等敏感数据；按私有化/本地部署产品处理，避免泄露本地数据和配置。
- 根仓库是 pnpm + lerna monorepo，不引入 npm/yarn lockfile。
- `packages/pro/` 是独立 Git 工作区；修改商业版代码后，必须在该目录单独执行 `git status` / `git diff`。
- 除非任务明确要求，不修改或提交运行时、构建产物：根目录的 `node_modules`、`logs`、`output`、`lerna-debug.log`、`tmp-certd-client-vite*.log`，后端的 `data` / `logs`，各包的 `dist`，以及插件 metadata/yaml 导出结果。
- 分析插件动态依赖时，可只读查看后端运行目录的 `data/.runtime-deps`，以实际安装的第三方 SDK 版本为准；不得纳入提交。

### 按任务定位

| 任务 | 优先入口 |
| --- | --- |
| 后端业务、接口、实体、权限 | `packages/ui/certd-server/src/modules`，再看对应 service/entity/controller |
| 前端页面、表单、插件配置 | `packages/ui/certd-client/src/views/certd`，再看页面 `api.ts` 或 `src/api`；系统管理页面在 `src/views/sys` |
| 单个服务商、DNS、部署、通知 | `packages/ui/certd-server/src/plugins`，再看 `packages/plugins/plugin-lib` |
| ACME、EAB、账号、订单、挑战 | `packages/core/acme-client`，或后端 `src/plugins/plugin-cert/plugin/cert-plugin/acme.ts` |
| 流水线执行、生命周期、输入输出、注册 | `packages/core/pipeline` |
| 通用证书读取、格式转换、DNS Provider | `packages/plugins/plugin-lib` |
| 商业版 | `packages/pro`，单独检查 Git 状态 |

其他入口：根 `package.json`（脚本）、`pnpm-workspace.yaml`（workspace 匹配 `packages/**`、`packages/ui/**`）、`lerna.json`（lerna-lite）；`packages/core/basic`（基础工具）、`packages/libs`（共享集成）、`packages/plugins/plugin-cert`（证书插件包入口）、`docs`（VitePress）、`docker`（安装与运行）。

## 2. 通用开发规则

### 编辑与执行

- 中文注释、文档、日志和界面文案优先；已有英文风格或外部术语可保留，业务规则、兼容逻辑、协议细节和隐藏风险尤其需要清晰注释。
- PowerShell 读写中文、Markdown、locale 等文件显式使用 UTF-8，例如 `Get-Content -Raw -Encoding UTF8`；输出仍乱码时，设置 `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()`。
- 文本/文件搜索优先用 `rg` / `rg --files`。PowerShell 搜索包含引号、括号、反斜杠的 pattern 时，用单引号包裹，例如 `rg 'await import\("tencentcloud-sdk-nodejs' packages/ui/certd-server/src -g '*.ts'`。
- 手工编辑优先用 `apply_patch`；同文件多处不连续改动，拆成独立调用，每次用一个 `*** Update File` 块只改附近上下文，不在一个块里强塞多个 `@@`，也不在同一次调用中重复指定同一文件。
- 仅机械化的大批量替换、格式化或生成任务考虑脚本。临时脚本放临时目录，并在同一个受控步骤内创建、执行、删除，不跨多步落在仓库里。
- 不主动运行 `pnpm install`；缺依赖、TTY 或网络导致安装/测试失败时，停止尝试并说明环境问题。
- 业务代码调用本地子进程时，用 `spawn` / `execFile` 等 argv API，将程序与参数分开传入，并显式设置 `shell: false`；禁止 `exec`、`shell: true` 或拼接/插值命令字符串执行动态值。服务端仍须校验用户可控参数，选项型参数优先使用允许列表。远程 SSH 命令按高权限操作处理并校验授权。
- 当修改需要考虑是否要兼容旧数据时，务必跟用户确认，得到用户准确回复后，再继续处理。

### 可读性与复用

- **可读性优先于短写法；与技能建议冲突时，以本条为准。** 少用三元表达式，优先完整 `if/else`；不要在单个表达式中嵌套分支、对象构造和方法调用。
- 复杂条件、调用链、内联对象和多层 helper 调用，拆成有意义的局部变量或小方法；不要把调用链直接塞进另一个方法参数。拆分应降低复杂度，避免增加无意义的阅读跳转。
- 沿用现有模块、插件、service 和页面模式。遵守 DRY 与单一职责；业务规则、字段转换、权限判断、Repository 选择、事务传播、金额计算等逻辑第三次出现时，优先提取合适 helper/service 方法。
- 没有明确复用价值时，不新增 `normalizeXxx` 等辅助方法，不为测试或形式上的复用增加抽象；简单兼容和字段转换直接在现有业务方法中处理。

## 3. 测试与验证

- 新功能、缺陷修复和重构遵循 TDD：先写/更新测试，覆盖正常路径、边界和明确的错误处理，运行确认 RED，再实现最小改动，最后运行聚焦测试确认 GREEN。
- 确实不适合先写测试时，回复中说明原因和替代验证方式。后补测试按正确行为写预期；若红灯需要修改既有实现，先向用户确认是 bug 还是既有需求，避免擅自改变行为。
- 单测优先直接测试原始业务方法；数据库、RPC 等外部依赖可 mock，不为方便测试提取无业务价值的 helper 或修改业务结构。
- 后端用 Mocha + Node `assert/strict`；纯单测放 `src/**/*.test.ts`，尽量与被测文件相邻。`test:unit` 只跑这些文件，构建/打包排除 `*.test.ts`；各包 `test:unit` 显式设置 `NODE_ENV=unittest`。
- mock ESM 静态 import（如 `@certd/plus-core` 的 `isPlus`、第三方包）优先用 `esmock(被测模块路径, { 依赖模块: { 导出: mock实现 } })`，不为测试添加 `isPlusFn` 等注入点。
- 优先验证改动文件/包；跨包影响明显时才扩大构建范围。后端测试参考 `src/utils/random.test.ts`、`src/controller/basic/app-controller.test.ts`、`src/modules/pipeline/service/pipeline-service.test.ts`。

### 常用命令

命令按表中工作目录执行；`<files>` 替换为本次改动文件。

| 场景 | 工作目录 | 命令 |
| --- | --- | --- |
| 后端纯单测 | `packages/ui/certd-server` | `npm run test:unit` |
| 其他包纯单测 | 对应包目录 | `npm run test:unit`，先确认脚本存在且非占位 |
| 前端格式化 | 仓库根目录 | `packages\ui\certd-client\node_modules\.bin\prettier.cmd --write <files>` |
| 前端 ESLint 修复 | 仓库根目录 | `packages\ui\certd-client\node_modules\.bin\eslint.cmd --fix <files>` |
| 后端 lint fix | `packages/ui/certd-server` | `npm run lint`（`mwts fix`；注意检查自动修复范围） |
| 其他包 lint fix | 对应包目录 | `npm run lint`，先确认脚本 |

**前端验证限制：** TS/Vue/locale 改动只对本次改动文件运行现有 Prettier / ESLint；不运行 `pnpm tsc` / `vue-tsc`（`vue-tsc@1.8.27` 会抛内部错误），不运行占位的 `test:unit`。

## 4. 后端规则

主包：`packages/ui/certd-server`；技术栈：Node.js、ESM、TypeScript、MidwayJS 3、Koa、TypeORM、SQL 迁移。本节 `src/`、`db/` 等路径均相对此包。

### 接口与数据访问

- `src/controller/sys` 下 HTTP Controller 方法：查询使用 `sys:settings:view`，新增、修改、删除及其他副作用操作使用 `sys:settings:edit`；不得使用 `authOnly` 或普通用户权限。**`src/controller/sys/authority` 是例外，保持原有权限字符串，不统一替换。**
- 表结构变更必须配套 `db/migration/*.sql`，不依赖 TypeORM 自动同步（`synchronize: false`）。
- `/basic/file/upload` 返回临时 key；业务保存前调用 `FileService.saveFile(userId, key, "public" | "private")` 转为永久 key，不能直接保存 `tmpfile_key_...`。
- 参数超过 3 个时，优先改为对象参数。只有需要事务传播时才定义 `ctx`，事务方法统一 `method(ctx, req)`：`ctx` 在前，复用 `BaseService` 导出的 `ServiceContext`（含 `manager?: EntityManager`），业务参数放 `req`。普通查询、纯函数、简单私有方法继续使用明确参数。
- 事务 Repository 用 `BaseService.getRepo(ctx, EntityClass)`；需要“有事务复用、无事务开启”时，用 `BaseService.transactionWithCtx(ctx, callback)`。
- 基础 CRUD 优先复用 `BaseService.find/findOne/list/page/update/deleteWhere`，不从 `repository.createQueryBuilder()` 重写完整查询/更新；仅将基类无法表达的组合筛选、联表、业务排序放入 `list/page` 的 `buildQuery`。
- **可选 `projectId` 查询必须用 `BaseService.buildUserProjectQuery(userId, projectId)`**，禁止直接构造 `{ userId, projectId }`，避免 `null`/`undefined` 产生错误查询条件。
- 新 service 方法不覆盖不兼容的基类签名，如用 `deleteById`，不要用 `delete(id)` 覆盖 `BaseService.delete(ids, where?)`。
- 用户安全封禁的 `access` 范围同时禁止访问和流水线运行（含后台、定时触发）；`pipeline` 范围仅禁止运行。运行检查直接兼容已有访问封禁，不补建重复规则。

### 证书仓库：保留空证书记录

`cd_cert_info` 的空证书记录是流水线占位。OpenAPI `autoApply` 据此判断流水线已存在、正在申请，并复用/触发已有流水线；删掉占位会导致申请成功前重复创建流水线。

- `PipelineService.save` 调用 `CertInfoService.updateDomains`，只同步 active 记录，保留 inactive/revoked 历史：每个 CertApply 类任务按 `task_id` 对应一条 active 记录，缺失时创建空证书记录；删除已无对应任务的孤儿 active 记录（含 `task_id` 为空的历史遗留）。多个申请任务分别维护，**不能把仍有对应任务的空记录当作垃圾删除**。
- `updateCertByPipelineId` 成功写入证书时，总是新建 active 记录，并把**同流水线、同 `task_id`** 的其他 active 记录标为 inactive；不删除空记录，不影响其他申请任务的 active 记录。
- `CertRevokeOld` 后置任务按 `task_id` 精确吊销同一申请任务产生的 inactive 旧证书，不误伤其他任务仍在使用的证书。

### 审计日志

- 审计日志是 Plus 功能，非 Plus 不写入。Controller 继承 `BaseController`，调用 `this.auditLog({ content: "xxx" })`。
- Controller 的 `@Post` 必须有 `summary`，例如 `@Post("/add", { summary: "新增记录" })`；它是日志 `action` 的来源。
- `getAuditType()` 返回类型常量；中间件按 `ctx.path` 判定 scope：`/api/sys/` 为 `system`，其他为 `user`。

### 后端入口

| 路径 | 用途 |
| --- | --- |
| `bootstrap.js` | `@midwayjs/bootstrap` 启动 |
| `src/configuration.ts` | 组件注册、全局中间件 |
| `src/config/config.default.ts` | 端口、HTTPS、静态文件、cron、TypeORM、Flyway、上传、JWT、Swagger 默认配置 |
| `src/config/loader.ts` | `.env` / `.env.<env>.yaml`，`certd_` 前缀环境变量覆盖嵌套配置 |
| `src/modules` | basic、cert、cname、cron、login、monitor、open、pipeline、plugin、suite、sys 等业务模块 |
| `src/controller` | basic、user、sys、openapi 分组的 API |
| `db/migration` | SQL 迁移 |

## 5. 前端规则

主包：`packages/ui/certd-client`；技术栈：Vue 3、Vite、TypeScript、Ant Design Vue、Fast Crud、Pinia、vue-router、vue-i18n。本节 `src/` 等路径均相对此包。

### 组件与交互

- 用户提示统一用 Ant Design Vue `notification.success({ message: X })` / `.error` / `.warning` / `.info`，禁止 `message` API；`src/vben/` 框架内置布局/组件保持原样。
- JSX render 直接写 JSX，禁止 `h()` 创建 VNode（包括 `Modal.confirm.content`、`useFormDialog.body`、动态插槽）。`.vue` 用 `<script setup lang="jsx">`，需要 JSX 的 `.ts` 改为 `.tsx`。
- 组件样式写在 `<style lang="less">`，不使用内联 `style` 或 `scoped`。每个顶层元素包含以组件名命名的根 class，全部样式置于根 class 下，用 Less 嵌套组织。
- 组件同时实现日间/夜间模式：根样式为日间，`body.dark` 下用 `.dark &` 覆盖夜间样式。可复用公共样式在 `src/style` 维护。

### 列表与表单：先判断适用范围

**一般页面使用 Fast Crud：** 列表管理、后台管理、记录查询、CRUD 表格开发/重构前，读仓库根 `.trae/skills/fast-crud-page-dev/SKILL.md`，沿用 `api.ts`、`crud.tsx`、`index.vue` 模式。

- 仅轻量只读展示、强交互自定义界面或既有模式明显不适合时，手写 `a-table` / 自定义列表，并在回复说明。fn-crud 试验范围按下述规则执行。
- 内嵌 Fast Crud 的外层必须有稳定高度，或完整 `flex: 1; min-height: 0` 链路。
- 有字段输入、校验或提交字段的对话框使用 `useFormDialog`；纯确认可用 `Modal.confirm`。
- `table-select` / `fs-table-select` 的 `dict` 必须配置 `getNodesByValues`，按已选 ID 批量懒加载，保证编辑回显与异步数据正常。
- 后台用户字段展示/筛选参考 `src/views/sys/suite/user-suite/crud.tsx` 的 `userId`：`table-select` + `/sys/authority/user/getSimpleUserByIds` 字典回显和搜索。其他页面参考 `src/views/certd/access`、`src/views/certd/wallet/index.vue`。

**fn-crud 试验范围：** `src/components/table` 与安全监控中心。

- 优先完善并复用本地 `FnTable`、`FnForm`、`FnModal`、`FnButton` 等组件；不得依赖 Fast Crud 组件、Provider 或 `useFormWrapper`。不自动迁移其他页面，扩大范围需用户确认。
- `src/components/table` 的图标统一用 `@lucide/vue`；按钮图标传 Lucide Vue 组件，不用 Ant Design 图标或 `fs-icon` 字符串。
- `FnFormProvider` 独立注册，提供 `openDialog` / `openFormDialog`，使用本地 `FnModal` / `FnForm`，并保留当前 Vue app 的组件注册、Ant Design Vue 配置和 provide/inject 上下文。有字段输入、校验或提交的对话框用其 `openFormDialog`；纯确认可用 `Modal.confirm`。

### 路由与国际化

- `meta.title` 是 i18n key，必须在 `src/locales/langs/zh-CN/`、`src/locales/langs/en-US/` 对应模块添加翻译，例如 `certd.auditLog` 对应“操作日志” / “Audit Log”。
- 菜单由路由生成，`meta.isMenu: true` 才显示。Plus 菜单设置 `meta.show: () => { const settingStore = useSettingStore(); return settingStore.isPlus; }`。

### 前端入口

| 路径 | 用途 |
| --- | --- |
| `vite.config.ts` | dev 端口 `3008`；`/api`、`/certd/api` 代理到 `127.0.0.1:7001` |
| `src/main.ts` | AntDV、Vben、router、全局组件、插件、偏好设置注册 |
| `src/App.vue` | 根组件，包含 AConfigProvider、FnFormProvider、FsFormProvider、router-view |
| `src/router/index.ts`、`src/router/resolve.ts` | 路由入口，`createWebHashHistory` |
| `src/router/source/modules/certd.ts` | Certd 主业务路由 |
| `src/store` | user、project、settings、plugin 等 Pinia store |
| `src/api/service.ts`、`src/api/tools.ts` | Axios 封装、错误与响应工具 |
| `src/views/certd` | pipeline、cert、monitor、access、notification、open、project、suite、wallet 等业务视图 |
| `src/locales` | 国际化入口与语言包 |

## 6. 流水线与插件规则

### 插件归属与兼容

- 新服务商、DNS 验证、部署、通知通常放插件包或后端 `src/plugins/<plugin-name>/`。修改前先判断归属，单个服务商/部署目标的问题留在对应插件；只有可复用公共语义或跨插件一致行为才上移到 `packages/core/pipeline` / `packages/plugins/plugin-lib`。
- 开发前按类型读仓库根技能：`.trae/skills/dns-provider-dev/SKILL.md`、`.trae/skills/task-plugin-dev/SKILL.md`、`.trae/skills/access-plugin-dev/SKILL.md`、`.trae/skills/plugin-converter/SKILL.md`。
- `.codex/skills` 链接到 `.trae/skills`；更新技能只维护后者，不复制第二份。
- 新增插件参数必须兼容旧数据：缺失时走旧版逻辑，例如新增 `deployType: default/custom` 时先判空。
- `newAccount({ onlyReturnExisting: true })` 用同一 account private key 取回已建账号 URL，不再次消费 EAB。修改 EAB `kid` 后应重新生成绑定该 `kid` 的账号私钥，否则阻止申请并提示刷新账号私钥。

### 插件市场身份与操作

- 唯一身份是 `fullName`：有作者为 `author/name`，内置插件为 `name`。数据库判重、同步/安装匹配、列表 `key` 和 Fast Crud `rowKey` 均用 `fullName`，不退回仅按 `name` 匹配。
- 新增/导入本地插件必须生成 `fullName`；旧数据缺失时，在迁移/兼容更新中按作者和名称补齐，防止同名不同作者互相覆盖或误判安装状态。
- 四类插件：内置（无作者，通过内置接口获取）、导入/自开发（无 `developerId`）、云端未安装（有 `developerId`，`installed=false`）、云端已安装（有 `developerId`，`installed=true`）。
- 云端归属只按当前站点绑定账号的 `userId === developerId` 判断，不以 `localEditable`、插件名或作者名代替。
- 所有卡片都有“配置”。导入/自开发显示编辑、复制、发布、删除；当前用户自己的已安装云端插件显示编辑、复制、发布；云端插件一律不显示删除，按 `installed` 显示安装/卸载。管理操作与卸载可同时存在，不能互相覆盖。

### 执行时序与状态

- `run()` 顺序固定：`notification("start")` → `runtime.start(pipeline)` → `runtime.clearNotificationStatus()` → `runWithHistory(主体 + 后置任务)` → 成功/失败通知。start 通知状态不参与显示，`clearNotificationStatus` 不得移到 start 通知之前。
- **插件主动返回 `"skip"` 时，`runStep` 仍须处理结果并保存 `step.status.output` / files。** 否则 lastRuntime 丢失输出，下次 `readLastCert` / SkipWhenSucceed 判断可能重新申请证书。
- SkipWhenSucceed 策略跳过时，`executePlugin` 返回 `skipped: true`，output/files 已从 lastStatus 拷贝，此时可跳过结果处理；不要与插件主动 skip 混淆。
- `emit.ts` 中 `PipelineEmitter<T> implements TaskEmitter<T>`；`emit(name, event)` 直接传事件对象，不包装 `{ pipeline, step, event }`。`PipelineEvent<T> = { cert: T; runnableId: string; pipelineId: number }` 定义在 `plugin/api.ts`。
- `base-convert.ts` 的 `emitCertApplySuccess` 发出 `{ cert, pipelineId: ctx.pipeline.id, runnableId: ctx.step.id }`；后端 `auto-pipeline-emitter-register.ts` 监听并调用 `updateCertByPipelineId(pipelineId, cert, fromType, taskId)`，userId/projectId 从 pipeline 实体读取。

### 后置任务（AfterTask）

- 主体结束后按 `when` 触发：`success`（主体成功）、`error`（主体失败）、`turnToSuccess`（手动标记成功）。插件声明 `supportAfterTask: true` 后可复用，如 `CertRevokeOld`。
- 实现在 `packages/core/pipeline/src/core/executor.ts` 的 `runAfterTasks/runOneAfterTask/executeAfterTaskPlugin` 与 `plugin/api.ts`。`executeAfterTaskPlugin` 构造无 strategy 的伪 Step，再调用共用 `executePlugin`；与普通任务执行链路一致，不增加差异化参数，区别只在 `matchAfterTaskWhen` 的触发判断。
- 失败由 `runAfterTasks` 聚合并 throw（`后置任务[标题]执行失败：...`），`runWithHistory` 将整条流水线标记失败，统一走 error 通知，不单独发后置任务失败通知。
- 没有内置等待时长；等待由插件用 `AbstractTaskPlugin.sleep(ms)` + `checkSignal()` 处理。
- 未触发/禁用写日志并标记 skip/disabled，状态存 `afterTask.status`，日志 key 为 `afterTask.{id}`。
- 成功/失败通知在主体与后置任务全部结束后发送，附加后置任务结果摘要。

### 流水线与插件入口

| 路径 | 用途 |
| --- | --- |
| `packages/core/pipeline/src/index.ts` | 导出 core、dt、access、registry、plugin、context、decorator、service、notification |
| `packages/core/pipeline/src/plugin` | AbstractTaskPlugin、IsTaskPlugin、TaskInput、pluginRegistry |
| `packages/core/pipeline/src/access` | BaseAccess、IsAccess、AccessInput、accessRegistry |
| `packages/core/pipeline/src/dt/pipeline.ts` | Pipeline、Stage、Task、RunStrategy 数据结构 |
| `packages/core/pipeline/src/core` | 执行器、上下文、运行历史、文件存储 |
| `packages/core/pipeline/src/service` | CNAME、事件、配置、邮件、URL 等服务接口 |
| `packages/ui/certd-server/src/plugins/plugin-cert` | 证书申请核心插件 |
| `packages/ui/certd-server/src/plugins/plugin-lib` | 后端插件 helper/access |
| `packages/plugins/plugin-lib/src/cert` | CertReader、CertConverter、DNS Provider 公共能力 |
| `packages/plugins/plugin-lib/src/cert/dns-provider` | AbstractDnsProvider、dnsProviderRegistry、DomainParser |

## 7. 收尾与规范维护

- 收尾回顾用户要求，只把经过确认、跨任务复用、稳定且与既有规则不冲突的共性约束精炼写入本文；不收录一次性细节、临时偏好或未经确认的推断。
- 更新后检查规则是否清晰、可执行，删除重复或矛盾表述；目录地图与验证命令以仓库实际配置为准。
