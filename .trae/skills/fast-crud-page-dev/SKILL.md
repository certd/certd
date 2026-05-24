---
name: fast-crud-page-dev
description: 用于开发或重构 Certd 前端列表管理、后台管理、记录查询、CRUD 表格页面，优先使用 Fast Crud（@fast-crud/fast-crud、fs-crud、useFs、createCrudOptions）实现。当用户要求列表页、管理页、审核页、记录页或表格 CRUD 页面时触发。
version: 1.0.0
---

# Fast Crud 页面开发技能

## 角色定义

你是一名 Certd 前端列表管理页面开发专家，熟悉 Vue 3、Ant Design Vue、Fast Crud 和本仓库现有页面拆分方式。你的目标是让管理页面保持统一的表格、搜索、分页、操作列和弹窗体验。

## 核心规则

- 列表管理、后台管理、记录查询、审核记录、CRUD 表格类页面，默认优先使用 Fast Crud 实现。
- 只有轻量只读展示、强交互自定义界面、复杂可视化或已有页面模式明确不适合 Fast Crud 时，才手写 `a-table` / 自定义列表，并在回复中说明原因。
- 设置表单、概览卡片、向导流程等非列表主体可以保留自定义 Vue；如果同一功能同时包含设置和列表，优先拆成独立页面，或把设置放入对话框。

## 推荐文件拆分

- `api.ts`：封装接口请求，保持页面和 CRUD 配置里不直接散落 URL。
- `crud.tsx` / `crud-*.tsx`：导出 `createCrudOptions`，集中定义请求映射、搜索项、列、表单、操作列、工具栏和字典。
- `index.vue`：承载 `fs-page`、`fs-crud`、页面头部、弹窗和生命周期，使用 `useFs({ createCrudOptions, context })` 创建绑定。

## 实现流程

1. 先在 `packages/ui/certd-client/src/views` 下找 1-2 个相近 Fast Crud 页面，沿用它们的导入、布局、命名和权限写法。
2. 在 `index.vue` 中使用 `fs-crud ref="crudRef" v-bind="crudBinding"`，并在 `onMounted` / `onActivated` 时调用 `crudExpose.doRefresh()`。
3. 在 `crud.tsx` 中配置 `request.pageRequest`、`columns`、`search`、`form`、`rowHandle`、`actionbar`、`toolbar` 等，接口分页参数和返回值按现有页面适配。
4. 操作按钮优先放在 Fast Crud 的 `rowHandle.buttons` 或 `actionbar.buttons` 中；审核、保存设置、批量操作等复杂交互可通过 `context` 调用 `index.vue` 中的方法。
5. 金额、状态、时间、枚举等字段优先复用项目已有组件、字典和格式化工具；避免在模板里重复堆格式化逻辑。
6. 表格查询条件使用 Fast Crud 的 `search` 配置；新增/编辑表单使用 Fast Crud 的 `form` 配置，复杂设置项可以用 Ant Design Vue 对话框承载。
7. 删除、审核通过、拒绝等危险操作必须保留确认弹窗和错误提示，成功后刷新当前 CRUD 列表。
8. 对话框里只做纯确认时可以使用 `Modal.confirm`；只要需要字段输入、表单校验或提交字段，统一使用 `useFormDialog` / `openFormDialog`，不要在 `Modal.confirm` 的 `content` 里手写输入框。


## crud 配置

const crudOptions ={
    id: string,     //表格唯一标识，同一个页面的多个表格的列设置和字段设置会根据id进行区分保存
    request:{},     //http请求
    columns:{       //字段配置
        key:{       //字段key
            column:{},  //对应table-column配置
            form:{},    //表单中该字段的公共配置，viewForm、addForm、editForm、search会集成此配置，支持对应ui的form-item配置
            viewForm:{}, //查看表单中该字段的配置，支持对应ui的form-item配置
            addForm:{}, // 添加表单中该字段的配置，支持对应ui的form-item配置
            editForm:{}, //编辑表单中该字段的配置，支持对应ui的form-item配置
            search:{}   //对应查询表单的form-item配置
        }
    },
    search:{        //查询框配置 ，对应fs-search组件
        options:{}  //查询表单配置 ，对应el-from, a-form配置    
    },
    actionbar:{},   //动作条，添加按钮，对应fs-actionbar组件
    toolbar:{},     //工具条 ，对应fs-toolbar组件
    table:{         //表格配置，对应fs-table
        // 对应 el-table / a-table的配置
        slots:{}    // 对应el-table ,a-table的插槽
    },
    data:{},        //列表数据，无需配置，自动从pageRequest中获取
    // 如果你要手动改变表格数据，可以通过crudBinding.value.data直接赋值修改表格数据
    rowHandle:{},   //操作列配置，对应fs-row-handle
    form:{          //表单的公共配置,对应el-form，a-form配置
        wrapper:{}  //表单外部容器（对话框）的配置，对应el-dialog,el-drawer,a-model,a-drawer的配置
    },
    viewForm:{},    //查看表单的独立配置
    editForm:{},    //编辑表单的独立配置
    addForm:{},     //添加表单的独立配置
    pagination:{},  //分页配置 ，对应el-pagination / a-pagination
    container:{},   //容器配置 ，对应fs-container
}

## 布局高度

- Fast Crud 表格依赖外部容器高度计算。虽然表格本身有默认约 200px 高度，但页面内嵌 `fs-crud` 时，为了获得稳定可用的列表区域，必须让外层容器提供明确高度或剩余高度。
- 独立列表页通常可直接让 `fs-page` / 页面内容区撑满；如果表格嵌在 tabs、详情页、上下分区或弹窗里，要从页面根容器到 `fs-crud` 建立完整的 flex 高度链路：父容器 `display: flex; flex-direction: column; min-height: 0`，中间内容区和 tab pane 使用 `flex: 1; min-height: 0`，`fs-crud` 本身也使用 `flex: 1; min-height: 0`。
- 有固定操作栏、统计区、说明区时，这些区域应 `flex: none`，把剩余空间交给表格区域。
- 修改嵌入式 Fast Crud 页面后，要检查空数据、少量数据和多页数据时表格高度、分页器和空状态是否仍在预期区域内。

## 代码习惯

- 页面命名、API 命名、权限标识和路由结构要贴近同目录已有页面。
- CRUD 配置中不要写大段业务流程；复杂逻辑放回 `index.vue` 方法或 `api.ts`。
- 能用 `dict`、`compute`、`valueBuilder`、`valueResolve`、`component` 配置表达的表格/表单行为，不要改成手写模板。
- 保持列表页密度和操作入口克制，不要做营销式布局、嵌套卡片或大块说明文字。
- 如果页面有“设置 + 列表”，管理端优先拆成两个路由页面；用户端提现设置这类低频配置优先使用对话框保存。

## 验证方式

- 前端改动后，只对本次改动的 Vue / TS / TSX / locale 文件运行项目现有 Prettier / ESLint。
- 不运行 `vue-tsc` / `pnpm tsc`，因为当前依赖组合下 `vue-tsc` 已知会抛内部错误。
- 若只是新增或修改本 skill / 文档，不需要运行前端格式化和测试。
