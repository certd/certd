# 流水线与插件规则

项目最关键的架构概念是证书流水线。核心导出、关键抽象、插件目录和共享 helper 位置见 `.codex/repo-map.md`。

插件是核心能力，不是边缘功能。新增服务商、DNS 验证、证书部署、通知方式等能力，通常应该放在插件包里，或放在 `packages/ui/certd-server/src/plugins/<plugin-name>/` 下。

## 改动归属

修改证书申请、验证、部署或通知行为时，先判断改动属于哪里：

- ACME client 代码
- pipeline 核心抽象
- 后端 module/service/entity/controller
- 某个具体插件实现
- 前端 view/form/schema

如果只是某个服务商或部署目标的问题，不要轻易修改共享 pipeline/core 行为，除非确实是可复用的公共能力。

## ACME / EAB

- 公共 EAB（尤其是 Google EAB）可能只能创建一次 ACME 账号。要跨用户复用公共 EAB，应保存并复用同一个 ACME account private key；`accountUrl` 如果存到 `userContext` 里，只能视为当前用户缓存，因为 `userContext` 跟用户 id 走。
- ACME 协议的 `newAccount` 支持 `onlyReturnExisting`。使用同一个 account private key 调用 `newAccount({ onlyReturnExisting: true })` 可以取回已创建账号的 URL，且不会再次消费 EAB。
- 修改 EAB 的 `kid` 后，应重新生成绑定该 `kid` 的 account private key；否则应阻止继续申请并提示用户刷新账号私钥。

## 插件开发技能

仓库内置了 Certd 插件开发技能，供 Trae 和 Codex 共用：

- Trae 入口：`.trae/skills`
- Codex 入口：`.codex/skills`

其中 `.codex/skills` 是指向 `.trae/skills` 的目录链接，不要复制出第二份技能内容。更新技能时只维护 `.trae/skills` 下的原始文件，Codex 会通过 `.codex/skills` 读取同一份内容。

当前技能包括：

- `access-plugin-dev`：开发 Access 授权插件
- `dns-provider-dev`：开发 DNS Provider 插件
- `fast-crud-page-dev`：开发或重构前端 Fast Crud 列表管理页面
- `task-plugin-dev`：开发 Task 部署任务插件
- `plugin-converter`：将插件转换为 YAML 配置

做插件相关任务时，先读取对应技能目录下的 `SKILL.md`，再进入具体实现。若用户在插件开发中指出更好的做法，应总结并更新对应技能。
