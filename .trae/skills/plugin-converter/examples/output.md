# 插件转换工具使用指南

## 工具说明

插件转换工具用于将单个 Certd 插件转换为 YAML 配置文件，方便插件的注册和管理。

## 工具位置

`.trae/skills/plugin-converter/resources/convert-plugin-to-yaml.js`

## 使用方法

### 基本用法

```bash
node .trae/skills/plugin-converter/resources/convert-plugin-to-yaml.js <插件文件路径>
```

### 示例

#### 转换 Access 插件

```bash
node .trae/skills/plugin-converter/resources/convert-plugin-to-yaml.js packages/ui/certd-server/src/plugins/plugin-demo/access.js
```

#### 转换 Task 插件

```bash
node .trae/skills/plugin-converter/resources/convert-plugin-to-yaml.js packages/ui/certd-server/src/plugins/plugin-demo/plugins/plugin-test.js
```

#### 转换 DNS Provider 插件

```bash
node .trae/skills/plugin-converter/resources/convert-plugin-to-yaml.js packages/ui/certd-server/src/plugins/plugin-demo/dns-provider.js
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

## 示例输出

### 转换 Access 插件示例

```bash
$ node .trae/skills/plugin-converter/resources/convert-plugin-to-yaml.js packages/ui/certd-server/src/plugins/plugin-demo/access.js
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
