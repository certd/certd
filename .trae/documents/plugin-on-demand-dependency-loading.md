# 插件依赖按需加载方案

## 背景与目标

### 当前问题
- `packages/ui/certd-server/node_modules` 包含 50+ 个插件的所有依赖，体积庞大
- 大量云厂商 SDK（AWS、阿里云、腾讯云、华为云等）只在特定插件中使用
- 用户通常只使用少数几个插件，但必须安装所有依赖

### 目标
实现依赖的按需下载和加载：
1. 插件依赖独立管理，不占用主 `node_modules` 空间
2. 只有当用户首次使用某插件时，才动态下载该插件需要的依赖
3. 依赖安装完成后，通过 `await import()` 从独立路径加载
4. 保持现有插件代码的最小改动

## 当前架构分析

### 插件加载机制
- 插件位于 `packages/ui/certd-server/src/plugins/` 下（50+ 个插件目录）
- `AutoLoadPlugins` 类在启动时扫描 `dist/plugins` 目录并动态导入
- 插件注册到不同的 registry：`accessRegistry`, `pluginRegistry`, `dnsProviderRegistry` 等
- 插件代码已经使用 `await import()` 进行懒加载（如 `await import("@aws-sdk/client-acm")`）

### 重型依赖分布
从 `packages/ui/certd-server/package.json` 分析，以下依赖体积大且仅特定插件使用：

**云厂商 SDK（按插件分组）：**
- **AWS 插件**：`@aws-sdk/client-acm`, `@aws-sdk/client-cloudfront`, `@aws-sdk/client-iam`, `@aws-sdk/client-route-53`, `@aws-sdk/client-s3`, `@aws-sdk/client-sts`
- **阿里云插件**：`@alicloud/openapi-client`, `@alicloud/pop-core`, `@alicloud/tea-typescript`, `@alicloud/fc20230330` 等
- **腾讯云插件**：`tencentcloud-sdk-nodejs`, `cos-nodejs-sdk-v5`
- **华为云插件**：`@huaweicloud/huaweicloud-sdk-cdn`, `@huaweicloud/huaweicloud-sdk-core` 等
- **Azure 插件**：`@azure/arm-dns`, `@azure/identity`
- **Google Cloud 插件**：`@google-cloud/dns`, `@google-cloud/publicca`
- **火山引擎插件**：`@volcengine/openapi`, `@volcengine/tos-sdk`

**网络/工具库：**
- `ssh2`, `socks`, `socks-proxy-agent`（SSH 相关插件）
- `ali-oss`, `qiniu`, `basic-ftp`（存储/传输插件）
- `nodemailer`（邮件通知插件）

**通用依赖（保留在主 package.json）：**
- `@midwayjs/*` 系列（框架核心）
- `@certd/*` 系列（项目内部包）
- `axios`, `lodash-es`, `dayjs`, `js-yaml` 等基础工具

## 设计方案

### 架构概览

```
packages/ui/certd-server/
├── package.json                    # 主依赖（框架、通用工具）
├── node_modules/                   # 主依赖安装目录
├── optional-deps/                  # 新增：可选依赖管理目录
│   ├── package.json                # 可选依赖总配置（用于 pnpm install）
│   ├── pnpm-lock.yaml              # 可选依赖锁文件
│   └── node_modules/               # 可选依赖安装目录
├── src/
│   └── modules/
│       └── dependency/             # 新增：依赖管理模块
│           ├── dependency-manager.ts    # 核心：依赖管理器
│           ├── dependency-registry.ts   # 依赖注册表（插件 -> 依赖映射）
│           └── types.ts                 # 类型定义
```

### 核心组件

#### 1. 依赖管理器（DependencyManager）

**职责：**
- 检查依赖是否已安装
- 动态执行 `pnpm install` 安装缺失依赖
- 提供从 `optional-deps/node_modules` 加载依赖的方法
- 并发控制：避免多个插件同时触发安装

**关键方法：**
```typescript
class DependencyManager {
  // 确保依赖已安装，返回依赖模块
  async ensureAndImport<T>(packageName: string): Promise<T>
  
  // 检查依赖是否已安装
  async isInstalled(packageName: string): Promise<boolean>
  
  // 安装依赖（带锁，避免并发）
  async installDependencies(packages: string[]): Promise<void>
  
  // 从 optional-deps/node_modules 加载依赖
  async loadModule<T>(packageName: string): Promise<T>
}
```

**实现要点：**
- 使用文件锁（如 `proper-lockfile`）防止并发安装
- 安装前检查 `optional-deps/node_modules/{packageName}` 是否存在
- 安装命令：`pnpm install --dir optional-deps --ignore-workspace`
- 加载时使用绝对路径：`import('file:///absolute/path/to/optional-deps/node_modules/package')`

#### 2. 依赖注册表（DependencyRegistry）

**职责：**
- 维护插件名称到依赖列表的映射
- 提供依赖查询接口

**数据结构：**
```typescript
interface PluginDependencyConfig {
  pluginName: string;
  dependencies: {
    packageName: string;
    version: string;
    optional?: boolean;  // 是否可选（安装失败不阻塞）
  }[];
}

// 示例注册
dependencyRegistry.register('plugin-aws', [
  { packageName: '@aws-sdk/client-acm', version: '^3.964.0' },
  { packageName: '@aws-sdk/client-cloudfront', version: '^3.964.0' },
  { packageName: '@aws-sdk/client-route-53', version: '^3.964.0' },
]);
```

#### 3. 插件集成

**改造现有插件代码：**

改造前（`plugin-aws/libs/aws-client.ts`）：
```typescript
const { ACMClient, ImportCertificateCommand } = await import("@aws-sdk/client-acm");
```

改造后：
```typescript
import { DependencyManager } from "../../../modules/dependency/dependency-manager.js";

const depManager = new DependencyManager();
const { ACMClient, ImportCertificateCommand } = await depManager.ensureAndImport("@aws-sdk/client-acm");
```

**简化方案（推荐）：**

创建辅助函数，减少改动量：
```typescript
// src/modules/dependency/import-helper.ts
export async function importOptionalDep<T>(packageName: string): Promise<T> {
  const depManager = new DependencyManager();
  return await depManager.ensureAndImport<T>(packageName);
}

// 插件中使用
import { importOptionalDep } from "../../../modules/dependency/import-helper.js";
const { ACMClient } = await importOptionalDep("@aws-sdk/client-acm");
```

### 实施步骤

#### 阶段一：基础设施搭建
1. 创建 `optional-deps/` 目录结构
2. 生成 `optional-deps/package.json`（包含所有可选依赖）
3. 实现 `DependencyManager` 核心逻辑
4. 实现依赖安装锁机制
5. 编写单元测试

#### 阶段二：依赖迁移
6. 从主 `package.json` 移除可选依赖
7. 将依赖添加到 `optional-deps/package.json`
8. 创建依赖注册表，映射插件到依赖

#### 阶段三：插件改造
9. 创建 `import-helper.ts` 辅助函数
10. 逐步改造插件代码，使用 `importOptionalDep` 加载依赖
11. 优先改造重型依赖（AWS、阿里云、腾讯云等）

#### 阶段四：测试与优化
12. 端到端测试：验证依赖按需安装和加载
13. 性能优化：缓存已加载的模块
14. 错误处理：安装失败时的降级策略
15. 文档：编写使用说明和迁移指南

## 关键技术决策

### 1. 依赖分组策略
**选择：按插件分组**
- 每个插件声明自己需要的依赖
- 优点：职责清晰，易于维护
- 缺点：可能有重复依赖（但 pnpm 会去重）

**备选：按功能分组**
- 将依赖按功能分组（如 "aws-deps", "aliyun-deps"）
- 优点：更细粒度控制
- 缺点：增加复杂度

### 2. 安装触发时机
**选择：首次使用时触发**
- 在插件的 `execute()` 或 `getClient()` 方法中触发安装
- 优点：真正的按需加载
- 缺点：首次使用有延迟

**备选：启动时预检查**
- 启动时扫描启用的插件，预安装依赖
- 优点：避免运行时延迟
- 缺点：可能安装不需要的依赖

### 3. 依赖路径解析
**选择：使用绝对路径 + `file://` 协议**
```typescript
const modulePath = path.resolve(__dirname, '../../optional-deps/node_modules', packageName);
return await import(`file://${modulePath}/index.js`);
```

**原因：**
- Node.js ESM 要求明确的 URL 格式
- 避免模块解析冲突

### 4. 并发控制
**选择：文件锁 + 内存锁双重保护**
- 使用 `proper-lockfile` 锁定 `optional-deps/` 目录
- 内存中使用 `Map` 记录正在安装的依赖
- 避免多个插件同时触发安装

### 5. 错误处理
**策略：**
- 安装失败时记录日志，抛出明确的错误信息
- 提供手动安装命令提示：`请运行: cd optional-deps && pnpm install`
- 支持降级：某些非核心依赖安装失败时，插件可以部分功能可用

## 验证方案

### 单元测试
1. 测试 `DependencyManager.isInstalled()` 正确检测依赖状态
2. 测试 `DependencyManager.installDependencies()` 成功安装依赖
3. 测试并发安装时的锁机制
4. 测试从 `optional-deps/node_modules` 加载模块

### 集成测试
1. 清空 `optional-deps/node_modules`
2. 启动服务，验证不触发安装
3. 调用 AWS 插件，验证触发安装并成功加载
4. 再次调用，验证不重复安装
5. 验证主 `node_modules` 体积减少

### 性能测试
1. 测量首次安装依赖的耗时
2. 测量后续加载的耗时（应该与正常 import 相近）
3. 对比改造前后的 `node_modules` 大小

## 风险与挑战

### 1. 首次使用延迟
**风险：** 用户首次使用插件时需要等待依赖安装（可能几十秒）
**缓解：**
- 在 UI 上显示安装进度
- 提供预安装命令：`pnpm run install-optional-deps`
- 文档说明首次使用会有延迟

### 2. 离线环境
**风险：** 离线环境无法下载依赖
**缓解：**
- 提供完整安装包（包含所有可选依赖）
- 支持手动复制 `node_modules`

### 3. 版本冲突
**风险：** 可选依赖与主依赖版本冲突
**缓解：**
- 使用 `--ignore-workspace` 隔离安装
- 定期同步主依赖版本

### 4. TypeScript 类型
**风险：** 动态导入的类型推断
**缓解：**
- 保留 `@types/*` 在主 `devDependencies`
- 使用泛型和类型断言

## 预期收益

1. **空间节省：** 主 `node_modules` 体积减少 60-70%（估算）
2. **安装速度：** 初始 `pnpm install` 速度提升 3-5 倍
3. **用户体验：** 不使用的插件不占用空间，按需加载
4. **维护性：** 依赖分组清晰，易于管理

## 后续优化

1. **依赖预热：** 在后台预安装常用插件依赖
2. **依赖缓存：** 支持从 CDN 或本地缓存安装
3. **依赖更新：** 提供命令批量更新可选依赖
4. **插件市场：** 支持从远程下载插件及其依赖配置

## 附录：依赖分类清单

### 可选依赖（迁移到 optional-deps/package.json）

**AWS 相关（plugin-aws, plugin-aws-cn）：**
```json
{
  "@aws-sdk/client-acm": "^3.964.0",
  "@aws-sdk/client-cloudfront": "^3.964.0",
  "@aws-sdk/client-iam": "^3.964.0",
  "@aws-sdk/client-route-53": "^3.964.0",
  "@aws-sdk/client-s3": "^3.964.0",
  "@aws-sdk/client-sts": "^3.990.0"
}
```

**阿里云相关（plugin-aliyun, plugin-lib/aliyun）：**
```json
{
  "@alicloud/fc20230330": "^4.1.7",
  "@alicloud/openapi-client": "^0.4.12",
  "@alicloud/openapi-util": "^0.3.2",
  "@alicloud/pop-core": "^1.7.10",
  "@alicloud/sts-sdk": "^1.0.2",
  "@alicloud/tea-typescript": "^1.8.0",
  "@alicloud/tea-util": "^1.4.10",
  "ali-oss": "^6.21.0"
}
```

**腾讯云相关（plugin-tencent, plugin-lib/tencent）：**
```json
{
  "tencentcloud-sdk-nodejs": "^4.1.112",
  "cos-nodejs-sdk-v5": "^2.14.6"
}
```

**华为云相关（plugin-huawei）：**
```json
{
  "@huaweicloud/huaweicloud-sdk-cdn": "3.1.185",
  "@huaweicloud/huaweicloud-sdk-core": "3.1.185",
  "@huaweicloud/huaweicloud-sdk-elb": "3.1.185",
  "@huaweicloud/huaweicloud-sdk-iam": "3.1.185",
  "esdk-obs-nodejs": "^3.25.6"
}
```

**Azure 相关（plugin-azure）：**
```json
{
  "@azure/arm-dns": "^5.1.0",
  "@azure/identity": "^4.13.1"
}
```

**Google Cloud 相关（plugin-google, plugin-cert/google）：**
```json
{
  "@google-cloud/dns": "^5.3.1",
  "@google-cloud/publicca": "^1.3.0"
}
```

**火山引擎相关（plugin-volcengine）：**
```json
{
  "@volcengine/openapi": "^1.28.1",
  "@volcengine/tos-sdk": "^2.9.1"
}
```

**SSH/网络相关（plugin-host, plugin-lib/ssh）：**
```json
{
  "ssh2": "^1.17.0",
  "socks": "^2.8.3",
  "socks-proxy-agent": "^8.0.4",
  "basic-ftp": "^5.0.5"
}
```

**其他存储/传输（plugin-qiniu, plugin-lib/qiniu）：**
```json
{
  "qiniu": "^7.12.0"
}
```

**邮件通知（plugin-notification/email）：**
```json
{
  "nodemailer": "^6.9.16"
}
```

### 主依赖（保留在主 package.json）

**框架核心：**
- `@midwayjs/*` 系列
- `@koa/cors`
- `typeorm`, `better-sqlite3`, `mysql2`, `pg`

**项目内部包：**
- `@certd/*` 系列

**通用工具：**
- `axios`, `lodash-es`, `dayjs`, `js-yaml`
- `crypto-js`, `jsonwebtoken`, `bcryptjs`
- `reflect-metadata`, `uuid`, `nanoid`
- 等等

## 总结

本方案通过引入独立的可选依赖管理机制，实现了插件依赖的按需下载和加载。核心思路是：

1. **隔离管理：** 在 `optional-deps/` 目录下维护独立的 `package.json` 和 `node_modules`
2. **动态安装：** 通过 `DependencyManager` 在首次使用时触发 `pnpm install`
3. **路径加载：** 使用绝对路径从独立目录加载依赖模块
4. **最小改动：** 通过辅助函数 `importOptionalDep` 简化插件代码改造

该方案可以显著减少主 `node_modules` 体积，提升初始安装速度，同时保持现有架构的兼容性和可维护性。
