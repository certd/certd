import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { expect, it, vi } from "vitest";
import { getFnTableRowKey } from "../table/row-key";
import { compute, resolveComputedValue } from "./compute";
import type { FnCrudExpose } from "../types/index";

const filename = fileURLToPath(new URL("./fn-crud.vue", import.meta.url));
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const script = compileScript(descriptor, { id: "fn-crud-test", fs: { fileExists: existsSync, readFile: path => readFileSync(path, "utf8") } });
const compiled = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const require = createRequire(import.meta.url);
const module = { exports: {} as any };
const loadDependency = (name: string) => {
  if (["../table/fn-table.vue", "../table/fn-pagination.vue", "../search/index.vue", "../tabs/index.vue", "../components/fn-button.vue", "../form/fn-form-dialog.vue", "../components/fn-render"].includes(name)) return {};
  if (name === "./compute") return { compute, resolveComputedValue };
  if (name === "../provider/context")
    return { fnCrudSearchKey: "search", fnCrudTableSelectionKey: "selection", useFnUiServices: () => ({ notification: { success: vi.fn(), error: vi.fn() }, message: { success: vi.fn(), error: vi.fn() } }) };
  if (name === "../table/row-key") return { getFnTableRowKey };
  if (name === "../modal/dialog") return { model: { confirm: vi.fn() } };
  if (name === "ant-design-vue") return { notification: { success: vi.fn(), error: vi.fn() } };
  return require(name);
};
new Function("require", "module", "exports", compiled.outputText)(loadDependency, module, module.exports);

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
    rowHandle: { key: "rowHandle", title: "操作", cell: { width: 180, order: Infinity } },
  });
  expect(setup.tableProps.value).not.toHaveProperty("rowHandle");
  expect(setup.tableProps.value).not.toHaveProperty("rowSelect");
  expect(setup.tableProps.value).not.toHaveProperty("selectedRowKeys");
});
