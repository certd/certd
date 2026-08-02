# 本地历史记录

历史记录和开发临时文件只保存在 Codex/Trae 当前工作区的 `tmp-online-plugin-dev/` 下，不调用 Certd 后端历史接口。

目录格式：

```text
tmp-online-plugin-dev/
  history/
    plugin-12/
      2026-08-02T12-30-00-before-edit.yaml
      2026-08-02T12-30-00-change.md
  work/
    plugin-12.yaml
    plugin-12-content.js
```

要求：

- 修改前保存完整 YAML。
- 临时 YAML、脚本草稿、调试记录都放到 `tmp-online-plugin-dev/` 下，不散落到项目目录。
- `change.md` 只记录插件 ID、版本、时间和脱敏修改摘要。
- 不保存 Token、证书、私钥、Cookie、环境变量和真实授权值。
- 恢复历史版本前先备份当前 YAML。
- 恢复后通过 `/sys/plugin/update` 或 `/sys/plugin/import` 写回 Certd。
