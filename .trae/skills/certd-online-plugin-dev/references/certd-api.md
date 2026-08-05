# Certd API

以下接口都以前端生成提示词中的 API 地址为基础地址，并使用 `Authorization` 请求头。

## 查询插件

```http
POST /scoped/sys/ai/plugin/find
Content-Type: application/json
Authorization: <token>
```

请求示例：

```json
{
  "keywords": ["aliyun", "dns"],
  "pluginType": "access",
  "includeBuiltIn": true,
  "includeStore": true
}
```

接口会分别查询内置插件和 `store` 插件，再合并返回：

- `type: "builtIn"`：内置插件，不通过在线开发 API 修改。
- `type: "store"` 且有 `appId` 或 `developerId`：市场插件。
- `type: "store"` 且没有 `appId`、`developerId`：本地插件。

结果中的 `editable` 是唯一的编辑权限依据；不能只按插件来源判断是否可修改。
列表结果只返回插件基础信息，不返回 `content`、`setting`、`sysSetting`、`metadata` 或 `extra`。需要完整 YAML 时再调用 `/scoped/sys/ai/plugin/export`。

## 读取插件信息

```http
POST /scoped/sys/ai/plugin/info?id=12
Authorization: <token>
```

## 导出完整 YAML

```http
POST /scoped/sys/ai/plugin/export
Content-Type: application/json
Authorization: <token>
```

```json
{
  "id": 12
}
```

## 保存插件

使用完整 YAML 导入：

```http
POST /scoped/sys/ai/plugin/import
```

```json
{
  "content": "完整 YAML",
  "override": true,
  "type": "store"
}
```

保存后重新调用 `/scoped/sys/ai/plugin/find` 或 `/scoped/sys/ai/plugin/info` 验证。
