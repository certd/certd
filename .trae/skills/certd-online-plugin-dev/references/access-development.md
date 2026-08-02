# Access 开发规范

Access 插件负责保存授权配置，也负责封装平台 API/SDK，供 Task 和 DNS Provider 复用。

## 查询顺序

1. 调用 `/sys/plugin/find`，使用 `pluginType: access`。
2. 根据 `name`、`author`、`fullName` 识别目标 Access。
3. 使用 `/sys/plugin/export` 读取完整 YAML。
4. 检查 `content` 中已经提供的方法。

## 修改规则

- Access 的 `editable: true` 时才允许修改。
- 修改前先保存本地历史。
- 优先把通用 API/SDK 能力放入 Access。
- 业务插件通过 `dependPlugins` 依赖 Access。
- `editable: false` 时不要尝试修改 Access，在业务插件内部实现必要的调用。
- 不要在日志中打印完整授权配置。
