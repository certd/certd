# 测试与验证规则

实现新功能或修复行为缺陷前，先补对应单元测试，并先运行测试确认它处于失败状态；再实现功能或修复代码，反复运行聚焦单元测试直到通过。若某项改动确实不适合先写单元测试，应在回复中说明原因和替代验证方式。

后补单元测试时，应先基于对正确行为的实际预期编写测试，而不是为了迎合现有实现改写预期；如果运行后出现红灯，且通过测试需要修改已有实现，应先向用户确认这是确实的 bug，还是原本需求/既有行为就是如此；确认后再修改原始实现，避免把测试补充变成未经确认的行为改动。

## 后端单测

- 后端纯单元测试用例放在 `src` 目录内，并尽量与被测文件相邻，例如 `src/utils/random.test.ts`。
- 对应 `test:unit` 只跑 `src/**/*.test.ts`，构建/打包配置应排除这些 `*.test.ts` 文件。
- 单元测试需要 mock ESM 静态 import 时，优先使用 `esmock`，不要为了测试把业务代码改成构造函数注入或把逻辑挪到调用方。
- 各包 `test:unit` 脚本应显式设置 `NODE_ENV=unittest`。

## 运行方式

单个 monorepo 包运行单元测试时，优先使用 `corepack pnpm --dir <包目录> test:unit`，例如：

- `corepack pnpm --dir packages\ui\certd-server test:unit`
- `corepack pnpm --dir packages\core\basic test:unit`
- `corepack pnpm --dir packages\plugins\plugin-lib test:unit`

也可以用包名过滤，例如 `corepack pnpm --filter @certd/ui-server test:unit`。

前端 `packages\ui\certd-client` 暂时不跑单元测试。前端改动优先使用 Prettier/ESLint 做改动文件验证。

优先对改动包运行聚焦测试；只有跨包影响明显时再考虑全 monorepo 构建。
