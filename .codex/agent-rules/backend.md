# 后端规则

主包：`packages/ui/certd-server`。后端使用 Node.js、ESM、TypeScript、MidwayJS 3、Koa、TypeORM，默认 better-sqlite3，同时支持 PostgreSQL 和 MySQL，并通过 `@certd/midway-flyway-js` 使用类似 Flyway 的 SQL 迁移机制。

详细入口、模块和验证命令见 `.codex/repo-map.md`。

## 默认开发配置

- HTTP 端口：`7001`
- HTTPS 端口：`7002`
- 默认 SQLite 数据库：`./data/db.sqlite`
- 默认文件根目录：`./data/files`

## 数据与迁移

- 后端使用 TypeORM 实体加 SQL 迁移。
- 重点查看 `packages/ui/certd-server/src/modules/**/entity/*.ts` 和 `packages/ui/certd-server/db/migration/*.sql`。
- 默认配置中 `synchronize: false`，涉及表结构变更时应添加或更新迁移脚本，不要依赖 TypeORM 自动同步。

## 文件上传

使用 `/basic/file/upload` 上传文件后，接口返回的是临时缓存 key。业务保存表单或设置时，后端必须调用 `FileService.saveFile(userId, key, "public" | "private")` 转成永久文件 key 后再入库/入设置；不要直接保存 `tmpfile_key_...`，否则后续回显或下载会失效。

## Service 与事务

- 后端方法参数超过 3 个时，尽量改为对象参数传入。
- 需要传入 `manager` / `EntityManager` 做事务传播的方法，必须使用对象参数，不要把 `manager` 作为位置参数藏在参数列表末尾。
- 后端 service 层只有存在事务链路传播需求时才定义 `ctx`，不要为了将来可能需要而提前给普通方法加 `ctx`。
- 事务链路方法统一采用 `method(ctx, req)` 形式，`ctx` 放第一位并承载 `manager?: EntityManager` 等横切上下文，业务参数放在 `req` 对象里，例如 `settleCommission({ manager }, { tradeId, userId, amount })`。
- 无事务链路需求的普通查询、纯函数和简单私有方法继续使用明确参数。
- service 内部需要根据事务上下文选择 Repository 时，优先使用 `BaseService.getRepo(ctx, EntityClass)`；不要在业务方法里反复写 `ctx.manager?.getRepository(Entity) || this.xxxRepository`。
- 拿到 repo 后 save/update/delete/find 都能做，不需要再包一层 `saveEntity` 之类的单一用途方法。
- `ctx` 类型统一从 `BaseService` 导出的 `ServiceContext` 复用，不要在每个 service 里重复定义。
- 需要“有事务则复用、无事务则开启”时，使用 `BaseService.transactionWithCtx(ctx, callback)`：`ctx.manager` 存在则直接执行 callback，否则自动 `this.transaction()`。不要在业务代码里手写 `if (ctx.manager) { ... } else { await this.transaction(...) }`。
- 新增方法注意不要与 `BaseService` 基类方法签名冲突，例如 `delete(id)` vs `BaseService.delete(ids, where?)`，ts-node 下会直接 TS2416 编译报错。冲突时改用具体名称如 `deleteById`。
