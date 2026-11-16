import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { expect, it, vi } from "vitest";
import { reactive } from "vue";
import { getFnTableRowKey } from "../table/row-key";
import { compute, resolveComputedValue } from "./compute";
import { deepMerge } from "./merge";
import * as crudUse from "./use";
import { fnCrudContext, uiContext } from "../provider/context";
import { useFnCrud } from "../use/use-fn-crud";
import type { FnCrudExpose } from "../types/index";
import * as preferences from "./preferences";

const filename = fileURLToPath(new URL("./fn-crud.vue", import.meta.url));
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const script = compileScript(descriptor, { id: "fn-crud-test", fs: { fileExists: existsSync, readFile: path => readFileSync(path, "utf8") } });
const compiled = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const require = createRequire(import.meta.url);
const module = { exports: {} as any };
const loadDependency = (name: string) => {
  if (
    [
      "../table/fn-table.vue",
      "../table/fn-pagination.vue",
      "../search/index.vue",
      "../tabs/index.vue",
      "../components/fn-button.vue",
      "../components/fn-toolbar.vue",
      "../components/fn-column-settings.vue",
      "../form/fn-form-dialog.vue",
      "../components/fn-render",
    ].includes(name)
  )
    return {};
  if (name === "./compute") return { compute, resolveComputedValue };
  if (name === "../provider/context")
    return {
      fnCrudSearchKey: "search",
      fnCrudTableSelectionKey: "selection",
      fnCrudContext,
      uiContext,
    };
  if (name === "./merge") return { deepMerge };
  if (name === "./use") return crudUse;
  if (name === "./preferences") return preferences;
  if (name === "../table/row-key") return { getFnTableRowKey };
  if (name === "../modal/dialog") return { model: { confirm: vi.fn() } };
  if (name === "ant-design-vue") return { notification: { success: vi.fn(), error: vi.fn() } };
  return require(name);
};
new Function("require", "module", "exports", compiled.outputText)(loadDependency, module, module.exports);

it("FnCrud 将 provider 公共配置与显式 props 深度合并", () => {
  fnCrudContext.configure({ commonOptions: () => ({ pagination: { pageSize: 20, showQuickJumper: true } }) });
  const setup = module.exports.default.setup({ columns: {}, request: { pageRequest: vi.fn() }, pagination: { pageSize: 50 } }, { emit: () => {}, expose: () => {} });

  expect(setup.paginationProps.value).toMatchObject({ pageSize: 50, showQuickJumper: true });
  expect(setup.page.pageSize).toBe(50);
  fnCrudContext.configure({ commonOptions: () => ({}) });
});

it("table.turnPage 使用当前搜索和排序条件并请求指定分页", async () => {
  const pageRequest = vi.fn(async () => ({ records: [], total: 0 }));
  let exposed!: FnCrudExpose;
  const setup = module.exports.default.setup({ columns: {}, request: { pageRequest }, pagination: { current: 1, pageSize: 10 } }, { emit: () => {}, expose: (value: FnCrudExpose) => (exposed = value) });
  setup.searchForm.keyword = "cert";
  setup.sort.value = { prop: "id", asc: false };

  await exposed.table.turnPage({ current: 3, pageSize: 20 });

  expect(pageRequest).toHaveBeenCalledWith({
    page: { offset: 40, limit: 20 },
    query: { keyword: "cert" },
    sort: { prop: "id", asc: false },
  });
  expect(Object.keys(exposed)).toEqual(["search", "form", "table"]);
});

it("FnCrud 维护跨页选择并从 table expose 提供选择操作", () => {
  const rows = [{ id: 12 }, { id: 13 }];
  const onChange = vi.fn();
  let exposed!: FnCrudExpose;
  const setup = module.exports.default.setup({ columns: {}, request: { pageRequest: vi.fn() }, rowSelect: { crossPage: true, onChange } }, { emit: () => {}, expose: (value: FnCrudExpose) => (exposed = value) });
  setup.data.value = rows;

  setup.changeSelection({ type: "page", selected: true });

  expect(exposed.table.getSelectedRowKeys()).toEqual(["12", "13"]);
  expect(exposed.table.getSelectedRows()).toEqual(rows);
  expect(onChange).toHaveBeenCalledWith(["12", "13"], rows);

  setup.data.value = [{ id: 20 }];
  setup.syncSelectionForRows(setup.data.value);

  expect(exposed.table.getSelectedRowKeys()).toEqual(["12", "13"]);
  expect(exposed.table.getSelectedRows()).toEqual([]);

  setup.changeSelection({ type: "row", row: setup.data.value[0], index: 0, selected: true });
  expect(exposed.table.getSelectedRowKeys()).toEqual(["12", "13", "20"]);
  expect(exposed.table.getSelectedRows()).toEqual([{ id: 20 }]);

  setup.clearSelectedRowKeys();

  expect(exposed.table.getSelectedRowKeys()).toEqual([]);
});

it("批量选择复用行索引，不重复查找行位置", () => {
  const setup = module.exports.default.setup({ columns: {}, request: { pageRequest: vi.fn() }, rowSelect: {} }, { emit: () => {}, expose: () => {} });
  setup.data.value = [{ id: 12 }, { id: 13 }];
  const indexOf = vi.spyOn(setup.data.value, "indexOf");

  setup.changeSelection({ type: "page", selected: true });

  expect(indexOf).not.toHaveBeenCalled();
});

it("FnCrud 把 rowHandle 组合进 FnTable columns", () => {
  const setup = module.exports.default.setup(
    {
      columns: { name: { key: "name", title: "名称" } },
      rowHandle: { width: 180, buttons: {} },
      request: { pageRequest: vi.fn() },
    },
    { emit: () => {}, expose: () => {} }
  );

  expect(setup.tableProps.value.columns).toMatchObject({
    name: { key: "name", title: "名称" },
    rowHandle: { key: "rowHandle", title: "操作", cell: { width: 180, fixed: "right", order: Infinity } },
  });
  expect(setup.tableProps.value).not.toHaveProperty("rowHandle");
  expect(setup.tableProps.value).not.toHaveProperty("rowSelect");
  expect(setup.tableProps.value).not.toHaveProperty("selectedRowKeys");
  expect(setup.columnSettingsColumns.value.map((column: { key: string }) => column.key)).not.toContain("rowHandle");
});

it("FnCrud 默认使用 comfort 密度并将工具栏放在搜索栏右侧", () => {
  const setup = module.exports.default.setup({ columns: {}, request: { pageRequest: vi.fn() } }, { emit: () => {}, expose: () => {} });

  expect(setup.size.value).toBe(14);
  expect(setup.density.value).toBe("comfort");
  expect(setup.layoutProps.value.map((row: any) => row.cols.map((col: any) => col.type))).toEqual([["header"], ["actionbar", "tabs", "search", "toolbar"]]);
  expect(setup.layoutProps.value[1].cols[1].style).toEqual({ flex: 1 });
});

it("FnCrud 将 px 字号与 density 分开传给 FnTable", () => {
  const crudState = reactive({ table: { size: 12, density: "comfort" as "comfort" | "compact" }, columns: {}, request: { pageRequest: vi.fn() } });
  useFnCrud(crudState as any);
  const setup = module.exports.default.setup(crudState, { emit: () => {}, expose: () => {} });

  expect(setup.size.value).toBe(12);
  expect(setup.density.value).toBe("comfort");
  crudState.table.density = "compact";
  expect(setup.density.value).toBe("compact");
  crudState.table.density = "comfort";
  crudState.onToggleDensity?.();
  expect(setup.size.value).toBe(12);
  expect(setup.density.value).toBe("compact");
  expect(crudState.table.density).toBe("compact");
});

it("页面加载先读取远程偏好再用已保存的 pageSize 请求列表", async () => {
  const preferences = { columns: {}, pageSize: 50, density: "compact" as const };
  const get = vi.fn(async () => preferences);
  const set = vi.fn(async () => undefined);
  const pageRequest = vi.fn(async () => ({ records: [], total: 0 }));
  let exposed!: FnCrudExpose;
  const setup = module.exports.default.setup(
    {
      columns: {},
      request: { pageRequest },
      id: "remote-pref-test",
      preferenceStorage: { get, set },
    },
    { emit: () => {}, expose: (value: FnCrudExpose) => (exposed = value) }
  );

  await setup.initializePreferences();

  expect(get).toHaveBeenCalledWith("fn-crud:remote-pref-test");
  expect(setup.page.pageSize).toBe(50);
  expect(setup.density.value ?? setup.density).toBe("compact");
  expect(pageRequest).toHaveBeenCalledWith({ page: { offset: 0, limit: 50 }, query: {}, sort: undefined });
  expect(exposed).toBeDefined();
});
