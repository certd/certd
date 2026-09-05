# 自定义 ACME 功能开发计划

## 一、背景与目标

Certd 目前仅支持内置 CA（Let's Encrypt / Google / ZeroSSL / SSL.com / litessl / LE 测试环境）。
目标：支持用户**自定义 ACME 证书颁发机构**——用户可填写任意符合 RFC 8555 的 ACME Directory URL
（内网 CA、企业 CA、其他公共 ACME 服务商），可选 EAB 授权，走完整的申请、续期、吊销流程。

## 二、需求确认（已与用户确认）

1. **Directory URL 填写位置**：在「ACME账号授权」中填写（账号与 CA 绑定，续期自动复用账号）。
   - 代码中 `directoryUrl` 字段、`caType === "custom"` 分支、`AcmeService.getAcmeClientByAccount()` 读取 `account.directoryUrl` 均已预留，架构改动最小。
2. **不做系统级公共自定义 CA 账号**：仅用户自建自己的 ACME 账号。
3. **自定义 CA 支持 EAB，选填**：填了就用，不填则跳过。
4. **吊销链路改造**（用户追加要求）：证书写入仓库时同时把 `acmeAccountAccessId` 记录到
   `cd_cert_info` 表，吊销时直接读表，**不再查询流水线**（旧数据回退兼容）。

## 三、现状分析

### 已有基础（无需改动或已预留）

| 位置 | 现状 |
| --- | --- |
| `@certd/acme-client` | 底层 `new Client({ directoryUrl })` 直接支持任意 URL，无需改动 |
| `AcmeAccountAccess.directoryUrl` 字段 | 已定义，但 `mergeScript` 里 `show: false` 隐藏 |
| `AcmeAccountAccess.getDirectoryUrl()` | 已有 `caType === "custom"` 分支：校验必填并返回 `directoryUrl` |
| `AcmeAccountInfo` 类型 | 已含 `directoryUrl`、`eab` 字段 |
| `AcmeService.getAcmeClientByAccount()` | 已支持 `account.directoryUrl \|\| acme.getDirectoryUrl(...)` |
| `AcmeAccountAccess.createAccountInfo()` | EAB 已选填（`eabKid && eabHmacKey` 才构造），custom 不强制 EAB |
| 前端 `Dicts.sslProviderDict` | 已含 `custom`（"自定义ACME"）选项 |

### 缺口（本次要开发）

1. `AcmeAccountAccess.caType` 下拉无 `custom` 选项；`directoryUrl` 被隐藏、无必填联动。
2. `AcmeAccountAccess` EAB 字段 `show` 条件不含 custom；custom 下应为选填（内置 CA 保持必填）。
3. `AcmeService.getAcmeClient()`（无账号临时建账号路径，生成账号时必走）用 `acme.getDirectoryUrl({ sslProvider: "custom" })` 会抛错，需要支持 `directoryUrl` 参数。
4. `CertApplyPlugin.sslProvider` 下拉无 `custom` 选项；custom 时 ACME 账号必选、preferredChain/certProfile 显隐、DNS 持久验证限制。
5. 吊销链路：`CertInfoService.revoke` 依赖 `resolveRevokeParams` 查流水线解析参数，需改为读表。
6. 数据库迁移：`cd_cert_info` 新增 `acme_account_access_id` 列。

## 四、改动清单

### 4.1 数据层：cd_cert_info 新增 ACME 账号列

- **迁移 SQL**：`packages/ui/certd-server/db/migration/v10055__cert_info_acme_account.sql`

```sql
-- 证书仓库记录增加ACME账号授权id：吊销旧证书时直接使用记录上的账号，无需再解析流水线配置
ALTER TABLE cd_cert_info ADD COLUMN acme_account_access_id bigint NULL;
```

- **Entity**：`packages/ui/certd-server/src/modules/monitor/entity/cert-info.ts`
  - 新增字段 `acmeAccountAccessId`（映射 `acme_account_access_id`，nullable）。

### 4.2 ACME账号授权：支持自定义CA（`access/acme-account-access.ts`）

1. `caType` 下拉 options 增加 `{ value: "custom", label: "自定义ACME" }`（放首位或末位均可，建议末位并注明"需自备 ACME 服务"）。
2. `directoryUrl`：
   - `mergeScript` 改为 `show: ctx.compute(({ form }) => form.access?.caType === "custom")`；
   - 动态 `required`（custom 时必填）；
   - helper 说明：填写 `https://` 开头的 Directory URL，如内网 CA 端点。
3. EAB 字段（`eabKid` / `eabHmacKey`）：
   - `show` 条件增加 `custom`；
   - custom 下**选填**（mergeScript 动态 `required: false`），内置 CA 保持必填；
   - `onGenerateAccount()` 中 `needEab` 列表**不加** custom（已满足选填语义）。
4. `getDirectoryUrl()` 已有 custom 分支，确认校验信息友好即可。

### 4.3 AcmeService 支持自定义 Directory URL（`plugin/cert-plugin/acme.ts`）

1. `AcmeServiceOptions` 增加 `directoryUrl?: string`。
2. `getAcmeClient(email)`：
   - `const directoryUrl = this.options.directoryUrl || acme.getDirectoryUrl({ sslProvider: this.sslProvider, pkType: this.options.privateKeyType })`；
   - custom 时若未传 `directoryUrl` 给出明确报错（"自定义ACME需要填写Directory URL"）。
3. `revokeCert` 方式二（证书私钥方式）同样优先用 `this.options.directoryUrl`。
4. `buildUrlMapping`：自定义域名不在内置映射表，天然走直连/用户反代，无需改动。

### 4.4 证书申请任务支持自定义CA（`plugin/cert-plugin/apply.ts`）

1. `sslProvider` 下拉 options 增加 `{ value: "custom", label: "自定义ACME", icon: "..." }`。
2. `onInit()` 构造 `AcmeService` 时：
   - 若 `sslProvider === "custom"`，读取 `this.acmeAccountAccessId` 对应 access 的 `account.directoryUrl`，传入 `AcmeServiceOptions.directoryUrl`；
   - custom 且未选 ACME 账号时直接报错（"自定义ACME必须选择对应的ACME账号"）。
3. 校验：
   - `doCertApply()` 中 custom 时强制 `acmeAccount`（version 1 也强制，version 2 已有强制逻辑）；
   - `sslProvider === "custom"` 且 `challengeType === "dns-persist"` 时提示不支持（dns-persist 是 Let's Encrypt 特有机制）。
4. 表单显隐（现有 mergeScript 天然兼容，需回归确认）：
   - `preferredChain`：custom 不在 `preferredChainSupportedProviders`，`show: false` ✓；
   - `certProfile`：仅 letsencrypt 显示 ✓；
   - `getCommonAcmeAccount()`：custom 时 `${sslProvider}CommonAcmeAccountAccessId` 不存在，返回 null ✓。
5. `getCheckChangeInputKeys()` 已含 `sslProvider`，切换 CA 会触发重新申请 ✓。

### 4.5 吊销链路改造（核心，用户指定方案）

**写入侧**：`packages/ui/certd-server/src/modules/monitor/service/cert-info-service.ts`

1. `updateCertByPipelineId(pipelineId, cert, fromType, taskId)`：
   - 已查询 `pipeline` 实体，从 `pipeline.content` 解析证书申请任务输入（复用/提取 `parseCertApplyInput` 为模块内方法），取出 `acmeAccountAccessId`；
   - 传入 `updateCert()`，写入记录（含占位记录复用更新场景）。
2. `UploadCertReq` 增加 `acmeAccountAccessId?: number`；`updateCert()` 落库该字段。

**吊销侧**：`CertInfoService.revoke(id, userId, projectId)`

1. 读 `entity.acmeAccountAccessId`：
   - **有值（新数据）**：`accessService.getAccessById(acmeAccountAccessId, true, userId, projectId)` → `access.getAccount()` 得到 `acmeAccount`，`sslProvider = acmeAccount.caType`，`useProxy/reverseProxy` 不传（`resolveUrlMapping` 有"直连失败自动启用代理"兜底）→ `acmeService.revokeCert({ cert, acmeAccount })`，**不再查流水线**；
   - **为空（旧数据 / upload 来源）**：回退现有 `resolveRevokeParams` 查流水线逻辑，保证旧版数据可吊销。
2. `createAcmeService()` 不再需要从流水线取 `useProxy/reverseProxy`（保留参数兼容即可）。

**事件链路**：`modules/auto/auto-pipeline-emitter-register.ts` 无需改动
（`updateCertByPipelineId` 内部自行解析流水线配置落库）。

### 4.6 前端

- `Dicts.sslProviderDict` 已有 `custom`，无需改；
- ACME账号授权、证书申请任务的表单 schema 均来自后端插件定义（`@AccessInput` / `@TaskInput`），前端组件零改动；
- 回归确认 `icon-select`（sslProvider）与 `a-select`（caType）能正常渲染新增选项。

## 五、实施顺序（TDD）

1. **写测试（RED）**：
   - `acme-account-access.test.ts`：custom + directoryUrl 生成账号（含 EAB 选填）、缺 directoryUrl 报错；
   - `acme.test.ts`：`AcmeService` 传/不传 `directoryUrl` 时 `getAcmeClient` 使用正确端点；
   - `apply.test.ts`：custom + ACME账号 申请链路（mock acme client）、custom 未选账号报错；
   - `cert-info-service.test.ts`：写入时 `acmeAccountAccessId` 落库；吊销读表（mock accessService）不再解析流水线；旧数据（列为空）回退旧逻辑。
2. **4.1 数据层**（迁移 SQL + entity）。
3. **4.3 AcmeService directoryUrl 支持**。
4. **4.2 ACME账号授权 custom 支持**。
5. **4.4 证书申请任务 custom 支持**。
6. **4.5 吊销链路改造**。
7. **4.6 前端回归验证**。
8. 全量单测 + lint。

## 六、测试与验证

- 后端单测：`cd packages\ui\certd-server && npm run test:unit`（聚焦 `cert-info-service`、`acme-account-access`、`acme`、`apply` 相关测试）；
- 改动文件 lint：`cd packages\ui\certd-server && npm run lint`；
- 手动验证：新建 caType=custom 的 ACME 账号（填 Directory URL，可选 EAB）→ 生成账号 → 证书申请任务选「自定义ACME」+ 该账号 → 申请成功 → 吊销旧证书（观察不再解析流水线）。

## 七、风险与兼容性

1. **旧版数据兼容**：`acme_account_access_id` 列可空，旧记录吊销回退查流水线逻辑，行为不变。
2. **dns-persist 限制**：自定义 CA 不支持 DNS 持久验证（LE 特有 `_validation-persist` 机制），申请任务做显式校验提示。
3. **代理/反代**：吊销时不再携带任务级 `useProxy/reverseProxy`，依赖 `resolveUrlMapping` 直连失败自动启用代理的兜底；自定义 CA 通常内网/直连可达，影响可接受。若后续需要可在表中再增列。
4. **无数据库以外的结构变更**；`updateDomains` 占位记录不强制写账号列（申请成功更新时补齐）。
5. 内置 CA 行为完全不变（`directoryUrl` 为空时走原逻辑）。
