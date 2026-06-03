# 前端规则

主包：`packages/ui/certd-client`。前端使用 Vue 3、Vite、TypeScript、Ant Design Vue、Fast Crud、Pinia、vue-router、vue-i18n、Tailwind/Windi 相关样式工具。

详细入口、路由、状态、API、视图、locale 和验证命令见 `.codex/repo-map.md`。

## 禁跑命令

- 不要运行前端 `pnpm tsc` / `vue-tsc`：当前依赖组合中 `vue-tsc@1.8.27` 会直接抛内部错误 `Search string not found: "/supportedTSExtensions = .*(?=;)/"`，不是有效的项目类型检查结果。
- 前端暂不跑单元测试；当前 `test:unit` 只是占位脚本。

## 格式化与校验

前端 TS/Vue/locale 等文件改动后，优先只对本次改动文件运行项目现有自动格式化/修复：

- Prettier：`packages\ui\certd-client\node_modules\.bin\prettier.cmd --write <files>`
- ESLint：`packages\ui\certd-client\node_modules\.bin\eslint.cmd --fix <files>`

不要为了格式化无关文件而扩大 diff。项目保留了 `tslint` 依赖，但当前主要使用 ESLint + Prettier。

## Fast Crud 页面

- 列表管理、后台管理、记录查询、CRUD 表格类页面，默认优先使用 Fast Crud（`@fast-crud/fast-crud`、`fs-crud`、`useFs`、`createCrudOptions`）实现。
- 只有轻量只读展示、强交互自定义界面或已有页面模式明确不适合 Fast Crud 时，才手写 `a-table` / 自定义列表，并在回复中说明原因。
- 开发或重构这类页面前，先读取 `.trae/skills/fast-crud-page-dev/SKILL.md`，按仓库内 Fast Crud 页面拆分与验证方式实现。
- 页面内嵌 Fast Crud 表格时，要显式给外层容器稳定高度或 `flex: 1; min-height: 0` 的撑满链路；Fast Crud 依赖外部元素高度，不能只依赖表格默认高度。
- 后台管理列表里展示或筛选用户字段时，优先参考 `packages/ui/certd-client/src/views/sys/suite/user-suite/crud.tsx` 的 `userId` 字段模式：前端使用 `table-select` + `/sys/authority/user/getSimpleUserByIds` 字典回显和搜索；不要为了展示用户名让后端列表接口额外 `fillSimpleUser` / `userDisplay`，除非该接口本身就是用户端业务列表且已有明确模式。

## 对话框

前端对话框里只做纯确认时可以使用 `Modal.confirm`；只要对话框里有字段输入、表单校验或提交字段，统一使用 `useFormDialog` / `openFormDialog`，不要在 `Modal.confirm` 的 `content` 里手写输入框。
