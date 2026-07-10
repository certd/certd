# 审计日志功能实施计划（MVP 版本）

## 一、摘要

为 Certd 系统增加基础审计日志功能，记录用户关键操作（流水线增删改/执行、授权管理、站点监控、通知设置、API密钥、用户管理、角色权限、项目管理、系统设置等），支持管理员和用户分别在管理后台和用户端查看操作日志。

**关键发现**：`cd_audit_log` 表已通过数据库迁移 v10038 创建，`AuditLogEntity` 实体已定义，字段完整可直接使用，写入和查询功能完全未实现。

> **MVP 范围**：仅实现简要记录（谁在何时对什么做了什么），流水线差异对比（diffContent）后续版本再补充。

## 二、当前状态分析

### 已存在的基础设施

| 组件 | 路径 | 状态 |
|------|------|------|
| 审计日志表 | `cd_audit_log`（迁移 v10038__admin_mode.sql） | ✅ 已创建 |
| 审计日志实体 | `packages/ui/certd-server/src/modules/sys/enterprise/entity/audit-log.ts` | ✅ 已定义 |
| BaseService 钩子 | `BaseService.modifyAfter(data)` | ✅ 已预留（空实现） |

### 审计日志表字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number (PK) | 主键 |
| `userId` | number | 操作人ID |
| `userName` | string(128) | 操作人用户名 |
| `projectId` | number | 项目ID（企业模式） |
| `projectName` | string(512) | 项目名称 |
| `type` | string(128) | 操作模块类型 |
| `action` | string(128) | 操作动作 |
| `content` | text | 操作内容摘要描述 |
| `ipAddress` | string(128) | 操作人IP |
| `createTime` | Date | 创建时间 |
| `updateTime` | Date | 修改时间 |

**无新增字段**，直接使用现有表结构。

### `ctx.user` 可用字段

JWT 登录路径：`{ id, username, roles }`
OpenKey 认证路径：`{ id, roles, projectId }`（**无 username**）

> **注意**：审计时若需 username 而 ctx.user.username 不存在，需要通过 userId 查询 UserEntity 获取。

## 三、需求范围

### 审计类型（type）与动作（action）

| 序号 | 模块 | type | action | 说明 |
|------|------|------|--------|------|
| 1 | 流水线 | `pipeline` | `add`/`update`/`delete`/`execute`/`cancel`/`batchDelete`/`batchUpdate` | 记录流水线的增删改、手动执行、取消、批量操作 |
| 2 | 授权管理 | `access` | `add`/`update`/`delete` | 记录云厂商授权凭据的增删改 |
| 3 | 站点监控 | `monitor` | `add`/`update`/`delete`/`batchDelete` | 记录站点证书监控的增删改 |
| 4 | 通知设置 | `notification` | `add`/`update`/`delete` | 记录通知配置的增删改 |
| 5 | API密钥 | `openKey` | `add`/`update`/`delete` | 记录开放接口密钥的增删改 |
| 6 | 用户管理 | `user` | `add`/`update`/`delete` | 记录系统管理员对用户的增删改 |
| 7 | 角色管理 | `role` | `add`/`update`/`delete` | 记录角色的增删改 |
| 8 | 权限管理 | `permission` | `add`/`update`/`delete` | 记录权限的增删改 |
| 9 | 项目管理 | `project` | `add`/`update`/`delete`/`disable` | 记录项目的增删改/启停 |
| 10 | 系统设置 | `settings` | `update` | 记录系统配置的修改 |

### 关键策略

- **存储**：仅数据库（使用已有 `cd_audit_log` 表，无新增字段/迁移）
- **粒度**：简要记录（谁对什么做了什么），无差异对比
- **保留策略**：按 90 天自动清理（硬编码，不提供配置界面，后续迭代再补配置）
- **前端**：管理后台（`/sys/audit` 查看全部） + 用户端（`/certd/audit` 仅查看自己的）

## 四、实施方案

### 4.1 后端：新增文件

#### 4.1.1 AuditService

**文件**：`packages/ui/certd-server/src/modules/sys/enterprise/service/audit-service.ts`

```typescript
@Provide()
export class AuditService {
  @Inject()
  dataSourceManager: TypeORMDataSourceManager;

  getRepository(): Repository<AuditLogEntity> {
    return this.dataSourceManager.getDataSource('default').getRepository(AuditLogEntity);
  }

  // 写入审计日志
  async log(params: {
    userId: number;
    type: string;
    action: string;
    content: string;
    username?: string;
    projectId?: number;
    projectName?: string;
    ipAddress?: string;
  }): Promise<void>;

  // 分页查询
  async page(pageReq: PageReq<AuditLogEntity>): Promise<PageResult>;

  // 删除指定天数之前的日志
  async cleanExpired(retentionDays: number): Promise<number>;
}
```

**关键实现细节**：
- `log()` 中若 `username` 为空，通过 `userId` 查 `UserEntity` 获取，查询失败也写入（username留空）
- `log()` 用 try-catch 包裹，写入失败仅 log error，不影响主业务
- `page()` 不做额外过滤，由 Controller 层控制 userId 过滤逻辑
- `cleanExpired()` 直接 DELETE WHERE `create_time < now - retentionDays`

#### 4.1.2 审计日志 Controller（管理后台）

**文件**：`packages/ui/certd-server/src/controller/sys/audit/audit-controller.ts`

路由前缀：`/api/sys/audit`

```typescript
@Provide()
@ApiTags(['audit'])
@Controller('/api/sys/audit')
export class SysAuditLogController {
  @Inject()
  auditService: AuditService;

  // POST /page - 分页查询（不过滤 userId，支持 type/action/userId/时间范围 筛选）
  // POST /delete - 删除单条日志
  // POST /clean - 手动清理过期日志
}
```

权限：`sys:settings:view`（查看）/ `sys:settings:edit`（删除/清理）

#### 4.1.3 审计日志 Controller（用户端）

**文件**：`packages/ui/certd-server/src/controller/user/audit/audit-controller.ts`

路由前缀：`/api/pi/audit`

```typescript
@Provide()
@ApiTags(['audit'])
@Controller('/api/pi/audit')
export class AuditLogController extends BaseController {
  @Inject()
  auditService: AuditService;

  // POST /page - 分页查询（自动过滤当前 userId）
}
```

权限：`authOnly`

#### 4.1.4 审计日志清理 Cron 任务

在 `AuditService` 中注册 cron：每天凌晨 3:00 执行，保留 90 天。

> 清理注册方式参考 `PipelineService` 中的 `this.cron.register()` 模式。

### 4.2 后端：修改现有文件

在以下 Controller 中注入 `AuditService` 并在关键方法中调用 `this.auditService.log(...)`。

#### 4.2.1 PipelineController（流水线）

**文件**：`packages/ui/certd-server/src/controller/user/pipeline/pipeline-controller.ts`

| 方法 | 审计 action | content 模板 |
|------|------------|-------------|
| `save` (新增, bean.id ≤ 0) | `add` | `创建了流水线「{title}」(ID:{id})` |
| `save` (修改, bean.id > 0) | `update` | `修改了流水线「{title}」(ID:{id})` |
| `delete` | `delete` | `删除了流水线(ID:{id})` |
| `trigger` | `execute` | `手动执行了流水线「{title}」(ID:{id})` |
| `cancel` | `cancel` | `取消了流水线执行(historyId:{historyId})` |
| `batchDelete` | `batchDelete` | `批量删除了{count}条流水线` |
| `batchUpdateGroup` | `batchUpdate` | `批量修改了{count}条流水线分组` |
| `batchUpdateTrigger` | `batchUpdate` | `批量修改了{count}条流水线触发器` |
| `batchUpdateNotification` | `batchUpdate` | `批量修改了{count}条流水线通知` |
| `batchUpdateCertApplyOptions` | `batchUpdate` | `批量修改了{count}条流水线证书申请配置` |
| `batchRerun` | `execute` | `批量重新执行了{count}条流水线` |
| `batchTransfer` | `batchUpdate` | `批量迁移了{count}条流水线` |
| `refreshWebhookKey` | `update` | `刷新了流水线(ID:{id})的Webhook密钥` |

**接入方式**：在方法末尾、返回 `this.ok(...)` 之前调用 `this.auditService.log(...)`。对 `save` 方法，根据 `bean.id > 0` 区分 add/update。对 `delete`/`trigger`/`cancel` 等方法，由于方法签名限制，content 中尽量使用已有变量，查不到标题就用 ID 描述。

#### 4.2.2 AccessController（授权管理）

**文件**：`packages/ui/certd-server/src/controller/user/pipeline/access-controller.ts`

| 方法 | 审计 action | content 模板 |
|------|------------|-------------|
| `add` | `add` | `新增了授权「{name}」(ID:{id}, 类型:{type})` |
| `update` | `update` | `修改了授权「{name}」(ID:{id})` |
| `delete` | `delete` | `删除了授权(ID:{id})` |

#### 4.2.3 SiteInfoController（站点监控）

**文件**：`packages/ui/certd-server/src/controller/user/monitor/site-info-controller.ts`

| 方法 | 审计 action | content 模板 |
|------|------------|-------------|
| `add` | `add` | `新增了站点监控「{name}」(ID:{id}, 域名:{domain})` |
| `update` | `update` | `修改了站点监控「{name}」(ID:{id})` |
| `delete` | `delete` | `删除了站点监控(ID:{id})` |
| `batchDelete` | `batchDelete` | `批量删除了{count}条站点监控` |

#### 4.2.4 NotificationController（通知设置）

**文件**：`packages/ui/certd-server/src/controller/user/pipeline/notification-controller.ts`

| 方法 | 审计 action | content 模板 |
|------|------------|-------------|
| `add` | `add` | `新增了通知配置「{name}」(ID:{id}, 类型:{type})` |
| `update` | `update` | `修改了通知配置「{name}」(ID:{id})` |
| `delete` | `delete` | `删除了通知配置(ID:{id})` |

#### 4.2.5 OpenKeyController（API密钥）

**文件**：`packages/ui/certd-server/src/controller/user/open/open-key-controller.ts`

| 方法 | 审计 action | content 模板 |
|------|------------|-------------|
| `add` | `add` | `新增了API密钥(ID:{id}, scope:{scope})` |
| `update` | `update` | `修改了API密钥(ID:{id})` |
| `delete` | `delete` | `删除了API密钥(ID:{id})` |

#### 4.2.6 UserController（用户管理 - 管理后台）

**文件**：`packages/ui/certd-server/src/controller/sys/authority/user-controller.ts`

| 方法 | 审计 action | content 模板 |
|------|------------|-------------|
| `add` | `add` | `新增了用户「{username}」(ID:{id})` |
| `update` | `update` | `修改了用户「{username}」(ID:{id})` |
| `delete` | `delete` | `删除了用户(ID:{id})` |

#### 4.2.7 RoleController（角色管理 - 管理后台）

**文件**：`packages/ui/certd-server/src/controller/sys/authority/role-controller.ts`

| 方法 | 审计 action | content 模板 |
|------|------------|-------------|
| `add` | `add` | `新增了角色「{name}」(ID:{id})` |
| `update` | `update` | `修改了角色「{name}」(ID:{id})` |
| `delete` | `delete` | `删除了角色(ID:{id})` |

#### 4.2.8 PermissionController（权限管理 - 管理后台）

**文件**：`packages/ui/certd-server/src/controller/sys/authority/permission-controller.ts`

| 方法 | 审计 action | content 模板 |
|------|------------|-------------|
| `add` | `add` | `新增了权限「{name}」(ID:{id})` |
| `update` | `update` | `修改了权限「{name}」(ID:{id})` |
| `delete` | `delete` | `删除了权限(ID:{id})` |

#### 4.2.9 ProjectController（项目管理 - 管理后台）

**文件**：`packages/ui/certd-server/src/controller/sys/enterprise/project-controller.ts`

| 方法 | 审计 action | content 模板 |
|------|------------|-------------|
| `add` | `add` | `新增了项目「{name}」(ID:{id})` |
| `update` | `update` | `修改了项目「{name}」(ID:{id})` |
| `delete` | `delete` | `删除了项目(ID:{id})` |
| `setDisabled` | `disable` | `{启用\|禁用了}项目「{name}」(ID:{id})` |

#### 4.2.10 系统设置 Controller

- **SysSettingsController**：`save` → `type=settings, action=update, content=修改了系统设置`
- **SysSafeSettingsController**：`save` → `type=settings, action=update, content=修改了安全设置`

### 4.3 后端：数据库迁移

**无需新增迁移**。使用已有 `cd_audit_log` 表，无新增字段。

### 4.4 后端：通用辅助

#### 4.4.1 审计日志提取 helper

创建一个轻量的提取函数，减少 Controller 中的重复代码：

```typescript
// 在 controller 中各方法调用示例
async add(@Body(ALL) bean: XxxEntity) {
  const result = await this.service.add(bean);
  await this.auditService.log({
    userId: this.getUserId(),
    username: this.ctx.user?.username,
    type: 'xxx',
    action: 'add',
    content: `新增了xxx「${bean.name}」(ID:${result.id})`,
    ipAddress: this.ctx.ip,
  });
  return this.ok(result);
}
```

### 4.5 前端：新增文件

#### 4.5.1 用户端审计日志页

```
packages/ui/certd-client/src/views/certd/audit/
├── api.ts
├── crud.tsx
└── index.vue
```

- **路由**：`/certd/audit`
- **菜单位置**：放在「设置」子菜单中
- **权限**：`authOnly`
- **功能**：展示当前用户的操作日志，支持按 type/action/时间范围 筛选
- **列**：操作时间、操作类型(type)、动作(action)、内容(content)、IP地址

#### 4.5.2 管理后台审计日志页

```
packages/ui/certd-client/src/views/sys/audit/
├── api.ts
├── crud.tsx
└── index.vue
```

- **路由**：`/sys/audit`
- **菜单位置**：放在「系统管理」菜单中
- **权限**：`sys:settings:view`
- **功能**：展示所有用户的操作日志，支持按 userId/type/action/时间范围 筛选
- **列**：操作时间、操作人(userName)、操作类型(type)、动作(action)、内容(content)、IP地址
- **额外操作**：删除单条、手动清理过期日志按钮（需 `sys:settings:edit` 权限）

#### 4.5.3 路由配置

**修改** `packages/ui/certd-client/src/router/source/modules/certd.ts`，在 settings children 中添加：

```typescript
{
  title: "certd.auditLog",
  name: "AuditLog",
  path: "/certd/audit",
  component: "/certd/audit/index.vue",
  meta: {
    icon: "ion:document-text-outline",
    auth: true,
    keepAlive: true,
  },
}
```

**修改** `packages/ui/certd-client/src/router/source/modules/sys.ts`，在 SysRoot children 中添加：

```typescript
{
  title: "certd.sysResources.auditLog",
  name: "SysAuditLog",
  path: "/sys/audit",
  component: "/sys/audit/index.vue",
  meta: {
    icon: "ion:document-text-outline",
    permission: "sys:settings:view",
    keepAlive: true,
    auth: true,
  },
}
```

#### 4.5.4 国际化

在 `packages/ui/certd-client/src/locales/` 的语言包中添加：

```json
{
  "certd.auditLog": "操作日志",
  "certd.sysResources.auditLog": "操作日志",
  "audit.type": "操作类型",
  "audit.action": "操作动作",
  "audit.content": "内容",
  "audit.ipAddress": "IP地址",
  "audit.userName": "操作人",
  "audit.createTime": "操作时间",
  "audit.cleanExpired": "清理过期日志"
}
```

## 五、实现顺序

1. **Phase 1：AuditService**
   - 创建 `AuditService`（`log`、`page`、`cleanExpired` 方法）
   - 注册审计日志清理 cron（默认保留 90 天）

2. **Phase 2：Controller 接入**
   - `SysAuditLogController` + `AuditLogController`（日志查询接口）
   - 逐个 Controller 接入审计日志：
     - PipelineController
     - AccessController
     - SiteInfoController
     - NotificationController
     - OpenKeyController
     - 管理后台 User/Role/Permission/Project/Settings Controllers

3. **Phase 3：前端**
   - 用户端 `/certd/audit` 页面
   - 管理后台 `/sys/audit` 页面
   - 路由 + 国际化

4. **Phase 4：测试**
   - AuditService 单元测试
   - 验证各模块操作是否正确写入日志

## 六、验证步骤

### 后端

1. 运行单元测试：`cd packages/ui/certd-server && npm run test:unit`
2. 手动验证：
   - 创建/修改/删除流水线 → 检查 `cd_audit_log` 表
   - 手动触发流水线 → 检查 execute 记录
   - 增删改授权/监控/通知/密钥 → 检查对应记录
   - 管理后台用户/角色/权限/项目/设置操作 → 检查记录

### 前端

1. 用户端 `/certd/audit` → 仅显示当前用户日志
2. 管理后台 `/sys/audit` → 显示全部日志，支持筛选和清理
3. 运行 ESLint/Prettier

## 七、注意事项

1. **不记录敏感数据**：content 中不记录密码、密钥等敏感信息
2. **不记录查询操作**：仅记录变更操作（add/update/delete/execute），不记录 page/list/info
3. **异常不影响主流程**：审计日志写入失败用 try-catch 包裹，仅 log error
4. **username 兼容性**：JWT 路径下 `ctx.user.username` 有值；OpenKey 路径下需从 UserService 查询
5. **事务隔离**：审计日志独立写入，避免主业务事务回滚时丢失
6. **批量操作**：批量操作一条审计记录记录概要信息，不为每个对象单独记录
7. **后续迭代预留**：diffContent 字段和系统设置中的审计配置项在后续版本补充，本次不做迁移
