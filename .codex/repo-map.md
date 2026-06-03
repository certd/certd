# Certd 仓库地图

本文档由 Codex 子智能体只读探索后整理，用于后续开发时快速定位代码。进入仓库仍应先读取根目录 `AGENTS.md`，本文件只作为导航补充。

## 顶层结构

Certd 是 pnpm + lerna-lite monorepo。

- `package.json`：根脚本与 workspace 元信息
- `pnpm-workspace.yaml`：workspace 匹配规则，包含 `packages/**`、`packages/ui/**`
- `lerna.json`：lerna-lite 配置
- `docs`：VitePress 文档站
- `docker`：Docker 安装和运行相关文件
- `packages/core/acme-client`：ACME 协议客户端
- `packages/core/basic`：共享基础工具
- `packages/core/pipeline`：流水线核心抽象、插件模型、执行上下文
- `packages/libs`：共享集成库
- `packages/plugins/plugin-lib`：证书、DNS Provider、格式转换等插件共享能力
- `packages/plugins/plugin-cert`：证书插件包入口
- `packages/ui/certd-server`：后端 Midway 服务
- `packages/ui/certd-client`：前端 Vue/Vite 管理台
- `packages/pro`：商业版独立 Git 工作区，需在该目录内单独检查状态

运行时或生成产物通常包括根目录 `node_modules`、`logs`、`output`、`lerna-debug.log`、`tmp-certd-client-vite*.log`，以及后端 `packages/ui/certd-server/data`、`packages/ui/certd-server/logs`、各包 `dist`、插件 metadata/yaml 导出结果。

## 常用验证

- 根目录启动后端生产模式：`pnpm run start:server`
- 后端开发服务：`corepack pnpm --dir packages\ui\certd-server dev`
- 后端聚焦单测：`corepack pnpm --dir packages\ui\certd-server test:unit`
- 后端完整测试：`corepack pnpm --dir packages\ui\certd-server test`
- 后端构建：`corepack pnpm --dir packages\ui\certd-server build`
- 前端开发服务：`corepack pnpm --dir packages\ui\certd-client dev`
- 前端构建：`corepack pnpm --dir packages\ui\certd-client build`
- 前端改动文件格式化：`packages\ui\certd-client\node_modules\.bin\prettier.cmd --write <files>`
- 前端改动文件 ESLint 修复：`packages\ui\certd-client\node_modules\.bin\eslint.cmd --fix <files>`

不要主动运行 `pnpm install`。前端不要运行 `pnpm tsc` / `vue-tsc`，当前依赖组合中 `vue-tsc@1.8.27` 会抛无效内部错误；前端 `test:unit` 也只是占位。

## 后端地图

主包：`packages/ui/certd-server`。

- `bootstrap.js`：Midway 启动入口，使用 `@midwayjs/bootstrap`
- `src/configuration.ts`：Midway 主配置，注册组件和全局中间件
- `src/config/config.default.ts`：端口、HTTPS、静态文件、cron、TypeORM、Flyway、上传、JWT、Swagger 默认配置
- `src/config/loader.ts`：读取 `.env`、`.env.<env>.yaml`，支持 `certd_` 前缀环境变量覆盖嵌套配置
- `src/modules`：业务模块根目录，例如 `basic`、`cert`、`cname`、`cron`、`login`、`monitor`、`open`、`pipeline`、`plugin`、`suite`、`sys`
- `src/controller`：API 入口，按 `basic`、`user`、`sys`、`openapi` 分组
- `db/migration`：SQL 迁移目录，TypeORM `synchronize: false`，表结构变更应配套迁移 SQL

测试使用 Mocha + Node `assert/strict`，纯单测放在 `src/**/*.test.ts`，尽量与被测文件相邻。可参考 `src/utils/random.test.ts`、`src/controller/basic/app-controller.test.ts`、`src/modules/pipeline/service/pipeline-service.test.ts`。

## 前端地图

主包：`packages/ui/certd-client`。

- `vite.config.ts`：Vite 配置，dev 端口 `3008`，`/api`、`/certd/api` 代理到后端 `127.0.0.1:7001`
- `src/main.ts`：Vue 启动入口，注册 AntDV、Vben、router、全局组件、插件和偏好设置
- `src/App.vue`：根组件，包含 `AConfigProvider`、`FsFormProvider`、`router-view`
- `src/router/index.ts`、`src/router/resolve.ts`：路由入口，使用 `createWebHashHistory`
- `src/router/source/modules/certd.ts`：Certd 主业务路由
- `src/store`：Pinia store，主要有 `user`、`project`、`settings`、`plugin`
- `src/api/service.ts`：Axios 封装
- `src/api/tools.ts`：错误与响应工具
- `src/views/certd`：核心业务视图，例如 `pipeline`、`cert`、`monitor`、`access`、`notification`、`open`、`project`、`suite`、`wallet`
- `src/locales`：国际化入口与语言包

列表管理、后台管理、记录查询、CRUD 表格页面优先使用 Fast Crud。开发前读取 `.trae/skills/fast-crud-page-dev/SKILL.md`。常见拆分是 `api.ts`、`crud.tsx`、`index.vue`。可参考 `src/views/certd/access`、`src/views/sys/suite/user-suite/crud.tsx`、`src/views/certd/wallet/index.vue`。内嵌 `fs-crud` 时要给外层稳定高度或完整 `flex: 1; min-height: 0` 链路。

## 流水线与插件地图

核心入口：`packages/core/pipeline/src/index.ts`，导出 `core`、`dt`、`access`、`registry`、`plugin`、`context`、`decorator`、`service`、`notification`。

- `packages/core/pipeline/src/plugin`：任务插件抽象，例如 `AbstractTaskPlugin`、`IsTaskPlugin`、`TaskInput`、`pluginRegistry`
- `packages/core/pipeline/src/access`：授权插件抽象，例如 `BaseAccess`、`IsAccess`、`AccessInput`、`accessRegistry`
- `packages/core/pipeline/src/dt/pipeline.ts`：`Pipeline`、`Stage`、`Task`、`RunStrategy` 等流水线数据结构
- `packages/core/pipeline/src/core`：执行器、上下文、运行历史、文件存储等
- `packages/core/pipeline/src/service`：CNAME、事件、配置、邮件、URL 等 pipeline service 接口
- `packages/ui/certd-server/src/plugins`：后端内置服务商、DNS、部署、通知等插件
- `packages/ui/certd-server/src/plugins/plugin-cert`：证书申请核心插件
- `packages/ui/certd-server/src/plugins/plugin-lib`：后端插件 helper/access
- `packages/plugins/plugin-lib/src/cert`：`CertReader`、`CertConverter`、DNS Provider 公共能力
- `packages/plugins/plugin-lib/src/cert/dns-provider`：`AbstractDnsProvider`、`dnsProviderRegistry`、`DomainParser`

插件开发技能入口：

- `.trae/skills/dns-provider-dev/SKILL.md`：DNS Provider 插件
- `.trae/skills/task-plugin-dev/SKILL.md`：Task 部署任务插件
- `.trae/skills/access-plugin-dev/SKILL.md`：Access 授权插件
- `.trae/skills/plugin-converter/SKILL.md`：插件转 YAML 配置

改动归属判断：

- ACME 协议、EAB、账号、订单、挑战流程：优先看 `packages/core/acme-client` 或 `packages/ui/certd-server/src/plugins/plugin-cert/plugin/cert-plugin/acme.ts`
- 流水线执行、任务生命周期、输入输出、注册机制：看 `packages/core/pipeline`
- 单个云厂商 DNS 验证、证书部署、API 调用失败：改对应 `packages/ui/certd-server/src/plugins/plugin-xxx`
- 通用证书读取、DNS Provider 公共能力、格式转换：改 `packages/plugins/plugin-lib`
- 后端业务数据、接口、实体、权限、迁移：改 `packages/ui/certd-server/src/modules` 与 `src/controller`
- 表单、列表、插件配置 UI：改 `packages/ui/certd-client/src/views/certd` 及对应 `src/api`

原则：如果只是单个服务商或部署目标的问题，不动共享 pipeline/core；只有可复用的公共语义或跨插件一致行为，才考虑上移到 `packages/core/pipeline` 或 `packages/plugins/plugin-lib`。

## Git 注意事项

子智能体探索时根仓库 `git status --short` 为空。`packages/pro` 也是独立仓库且当时未显示未提交改动，但曾出现无法删除 `packages/pro/.git/index.lock` 的警告；后续操作 pro 仓库前应先检查该锁文件或占用状态。
