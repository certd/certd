# 插件转换工具技能

## 什么是插件转换工具

插件转换工具是一个用于将 Certd 插件转换为 YAML 配置文件的命令行工具。它可以分析单个插件文件，识别插件类型，并生成对应的 YAML 配置，可以让插件分发和在线注册。

## 工具位置

`trae/skills/convert-plugin-to-yaml.js`

## 功能特性

- **单个插件转换**：支持指定单个插件文件进行转换，而不是扫描整个目录
- **自动类型识别**：自动识别插件类型（Access、Task、DNS Provider、Notification、Addon）
- **详细日志输出**：提供详细的转换过程日志，便于调试
- **YAML 配置生成**：生成标准的 YAML 配置文件
- **配置文件保存**：自动将生成的配置保存到 `./metadata` 目录
- **可复用函数**：导出了可复用的函数，便于其他模块调用

## 使用方法

### 基本用法

```bash
node trae/skills/convert-plugin-to-yaml.js <插件文件路径>
```

### 示例

```bash
# 转换 Access 插件
node trae/skills/convert-plugin-to-yaml.js packages/ui/certd-server/src/plugins/plugin-demo/access.js

# 转换 Task 插件
node trae/skills/convert-plugin-to-yaml.js packages/ui/certd-server/src/plugins/plugin-demo/plugins/plugin-test.js

# 转换 DNS Provider 插件
node trae/skills/convert-plugin-to-yaml.js packages/ui/certd-server/src/plugins/plugin-demo/dns-provider.js
```

## 转换过程

1. **加载插件模块**：使用 `import()` 动态加载指定的插件文件
2. **分析插件定义**：检查模块导出的对象，寻找带有 `define` 属性的插件
3. **识别插件类型**：根据插件的继承关系或属性识别插件类型
4. **生成 YAML 配置**：基于插件定义生成标准的 YAML 配置
5. **保存配置文件**：将生成的配置保存到 `./metadata` 目录

## 输出说明

### 命令行输出

执行转换命令后，工具会输出以下信息：

- 插件加载状态
- 插件导出的对象列表
- 插件类型识别结果
- 生成的 YAML 配置内容
- 配置文件保存路径

### 配置文件命名规则

生成的配置文件命名规则为：

```
<插件类型>[_<子类型>]_<插件名称>.yaml
```

例如：
- `access_demo.yaml`（Access 插件）
- `deploy_DemoTest.yaml`（Task 插件）
- `dnsProvider_demo.yaml`（DNS Provider 插件）

## 插件类型识别逻辑

工具通过以下逻辑识别插件类型：

1. **DNS Provider**：如果插件定义中包含 `accessType` 属性
2. **Task**：如果插件继承自 `AbstractTaskPlugin`
3. **Notification**：如果插件继承自 `BaseNotification`
4. **Access**：如果插件继承自 `BaseAccess`
5. **Addon**：如果插件继承自 `BaseAddon`

## 注意事项

1. **文件路径**：插件文件路径可以是相对路径或绝对路径
2. **文件格式**：仅支持 `.js` 文件，不支持 `.ts` 文件（需要先编译）
3. **依赖安装**：执行前确保已安装所有必要的依赖
4. **配置目录**：如果 `./metadata` 目录不存在，工具会自动创建
5. **错误处理**：如果插件加载失败或识别失败，工具会输出错误信息但不会终止执行

## 代码结构

### 主要函数

1. **isPrototypeOf(value, cls)**：检查对象是否是指定类的原型
2. **loadSingleModule(filePath)**：加载单个插件模块
3. **convertSinglePlugin(pluginPath)**：分析单个插件并生成 YAML 配置
4. **main()**：主函数，处理命令行参数并执行转换

### 导出函数

工具导出了以下函数，便于其他模块调用：

```javascript
export {
  convertSinglePlugin,  // 转换单个插件
  loadSingleModule,     // 加载单个模块
  isPrototypeOf         // 检查原型关系
};
```

## 应用场景

1. **插件开发**：在开发新插件时，快速生成配置文件
2. **插件调试**：查看插件的内部定义和配置
3. **插件管理**：批量转换现有插件为标准配置格式
4. **自动化构建**：集成到构建流程中，自动生成插件配置

## 示例输出

### 转换 Access 插件示例

```bash
$ node trae/skills/convert-plugin-to-yaml.js packages/ui/certd-server/src/plugins/plugin-demo/access.js
开始转换插件: packages/ui/certd-server/src/plugins/plugin-demo/access.js
插件模块导出了 1 个对象: DemoAccess
处理插件: DemoAccess
插件类型: access
脚本路径: packages/ui/certd-server/src/plugins/plugin-demo/access.js

生成的 YAML 配置:
name: demo
title: 授权插件示例
desc: 这是一个示例授权插件，用于演示如何实现一个授权插件
icon: clarity:plugin-line
pluginType: access
type: builtIn
scriptFilePath: packages/ui/certd-server/src/plugins/plugin-demo/access.js

YAML 配置已保存到: ./metadata/access_demo.yaml
插件转换完成!
```

### 转换 Task 插件示例

```bash
$ node trae/skills/convert-plugin-to-yaml.js packages/ui/certd-server/src/plugins/plugin-demo/plugins/plugin-test.js
开始转换插件: packages/ui/certd-server/src/plugins/plugin-demo/plugins/plugin-test.js
插件模块导出了 1 个对象: DemoTest
处理插件: DemoTest
插件类型: deploy
脚本路径: packages/ui/certd-server/src/plugins/plugin-demo/plugins/plugin-test.js

生成的 YAML 配置:
name: DemoTest
title: Demo-测试插件
desc: ""
icon: clarity:plugin-line
group: other
default:
  strategy:
    runStrategy: SkipWhenSucceed
pluginType: deploy
type: builtIn
scriptFilePath: packages/ui/certd-server/src/plugins/plugin-demo/plugins/plugin-test.js

YAML 配置已保存到: ./metadata/deploy_DemoTest.yaml
插件转换完成!
```

## 故障排除

### 常见问题

1. **模块加载失败**
   - 原因：插件文件依赖未安装或路径错误
   - 解决：确保已安装所有依赖，检查文件路径是否正确

2. **插件类型识别失败**
   - 原因：插件未正确继承基类或缺少必要的属性
   - 解决：检查插件代码，确保正确继承对应的基类

3. **YAML 配置生成失败**
   - 原因：插件定义格式不正确
   - 解决：检查插件的 `define` 属性格式是否正确

4. **配置文件保存失败**
   - 原因：权限不足或磁盘空间不足
   - 解决：确保有足够的权限和磁盘空间

### 调试建议

- **查看详细日志**：工具会输出详细的转换过程日志，仔细查看日志信息
- **检查插件代码**：确保插件代码符合 Certd 插件开发规范
- **尝试简化插件**：如果转换失败，尝试创建一个最小化的插件示例进行测试
- **检查依赖版本**：确保使用的依赖版本与 Certd 兼容

## 总结

插件转换工具是一个方便实用的工具，它可以帮助开发者快速生成插件的 YAML 配置文件，简化插件的注册和管理过程。通过命令行参数指定单个插件文件，工具会自动完成类型识别、配置生成和保存等操作，大大提高了插件开发和管理的效率。