import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { expect, it, vi } from "vitest";
import { getFnTableRowKey } from "./row-key";
import { isFnComputeValue } from "../crud/compute";
import type { FnTableSelectionContext } from "../types/index";

const filename = fileURLToPath(new URL("./fn-table.vue", import.meta.url));
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const script = compileScript(descriptor, { id: "fn-table-test", fs: { fileExists: existsSync, readFile: path => readFileSync(path, "utf8") } });
const compiled = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const require = createRequire(import.meta.url);
const module = { exports: {} as any };
let selectionContext: FnTableSelectionContext | undefined;
const loadDependency = (name: string) => {
  if (name === "@lucide/vue" || name === "./fn-table-cell.vue" || name === "../components/fn-render") return {};
  if (name === "./row-key") return { getFnTableRowKey };
  if (name === "../crud/compute") return { isFnComputeValue };
  if (name === "../provider/context") return { fnCrudTableSelectionKey: "selection" };
  if (name === "vue") return { ...require(name), inject: () => selectionContext };
  return require(name);
};
new Function("require", "module", "exports", compiled.outputText)(loadDependency, module, module.exports);

it("按 columns 对象生成有序渲染列", () => {
  const props = { columns: { name: { title: "名称", cell: { order: 1 } }, id: { title: "ID", cell: { order: 2 } } } };
  const setup = module.exports.default.setup(props, { expose: () => {}, emit: () => {} });
  expect(setup.columns.value.map(column => column.key)).toEqual(["name", "id"]);
});

it("未指定 order 的列保持在明确排序列之后", () => {
  const props = { columns: { actions: { title: "操作", cell: { fixed: "right" as const } }, name: { title: "名称", cell: { order: 1 } } } };
  const setup = module.exports.default.setup(props, { expose: () => {}, emit: () => {} });
  expect(setup.columns.value.map(column => column.key)).toEqual(["name", "actions"]);
});

it("每组固定列只在滚动边界列添加阴影", () => {
  const setup = module.exports.default.setup(
    {
      columns: {
        leftFirst: { title: "左一", cell: { fixed: "left", order: 1 } },
        leftLast: { title: "左二", cell: { fixed: "left", order: 2 } },
        normal: { title: "普通", cell: { order: 3 } },
        rightFirst: { title: "右一", cell: { fixed: "right", order: 4 } },
        rightLast: { title: "右二", cell: { fixed: "right", order: 5 } },
      },
      data: [],
    },
    { expose: () => {}, emit: () => {} }
  );

  expect(setup.columnClasses(setup.columns.value[0])).toContain("fn-table-fixed-left");
  expect(setup.columnClasses(setup.columns.value[0])).not.toContain("fn-table-fixed-left-shadow");
  expect(setup.columnClasses(setup.columns.value[1])).toContain("fn-table-fixed-left-shadow");
  expect(setup.columnClasses(setup.columns.value[3])).toContain("fn-table-fixed-right-shadow");
  expect(setup.columnClasses(setup.columns.value[4])).not.toContain("fn-table-fixed-right-shadow");
});

it("固定列使用组内累计宽度计算 sticky 偏移", () => {
  selectionContext = { type: "multiple", selectedRowKeys: { value: [] } as FnTableSelectionContext["selectedRowKeys"], changeSelection: vi.fn() };
  const setup = module.exports.default.setup(
    {
      columns: {
        leftFirst: { title: "左一", cell: { fixed: "left", width: 100, order: 1 } },
        leftNext: { title: "左二", cell: { fixed: "left", width: 120, order: 2 } },
        normal: { title: "普通", cell: { width: 200, order: 3 } },
        rightFirst: { title: "右一", cell: { fixed: "right", width: 90, order: 4 } },
        rightLast: { title: "右二", cell: { fixed: "right", width: 110, order: 5 } },
      },
      data: [],
    },
    { expose: () => {}, emit: () => {} }
  );

  expect(setup.columnStyle(setup.columns.value[0], "leftFirst")).toMatchObject({ left: "44px" });
  expect(setup.columnStyle(setup.columns.value[1], "leftNext")).toMatchObject({ left: "144px" });
  expect(setup.columnStyle(setup.columns.value[3], "rightFirst")).toMatchObject({ right: "110px" });
  expect(setup.columnStyle(setup.columns.value[4], "rightLast")).toMatchObject({ right: "0px" });
});

it("行动态计算 context 使用 CRUD 字段配置和当前行", () => {
  const columns = { name: { key: "name", title: "名称" } };
  const row = { id: 12, name: "cert" };
  const setup = module.exports.default.setup({ columns, data: [row] }, { expose: () => {}, emit: () => {} });

  expect(setup.getRowContext(row, 0)).toMatchObject({ type: "row", row, form: row, index: 0, columns });
});

it("行选择交由 FnCrud selection context 处理", () => {
  const changeSelection = vi.fn();
  const selectedRowKeys = { value: ["12"] } as FnTableSelectionContext["selectedRowKeys"];
  selectionContext = { type: "multiple", selectedRowKeys, changeSelection };
  const props = {
    data: [{ id: 12 }, { id: 13 }],
    rowKey: "id",
  };
  let exposed: unknown;
  const setup = module.exports.default.setup(props, { expose: (value: unknown) => (exposed = value), emit: vi.fn() });

  expect(setup.isRowSelected(props.data[0], 0)).toBe(true);
  expect(setup.isRowSelected(props.data[1], 1)).toBe(false);

  setup.selectRowOnChange(props.data[1], 1, true);

  expect(changeSelection).toHaveBeenCalledWith({ type: "row", row: props.data[1], index: 1, selected: true });
  expect(exposed).toBeUndefined();
});

it("选择当前页由 FnCrud selection context 处理", () => {
  const changeSelection = vi.fn();
  selectionContext = { type: "multiple", selectedRowKeys: { value: ["9"] } as FnTableSelectionContext["selectedRowKeys"], changeSelection };
  const props = {
    data: [{ id: 12 }],
    rowKey: "id",
  };
  const setup = module.exports.default.setup(props, { expose: () => {}, emit: vi.fn() });

  setup.togglePageSelection(false);

  expect(changeSelection).toHaveBeenCalledWith({ type: "page", selected: false });
});

it("调整列宽时在拖动结束后只发出一次宽度变更", () => {
  const listeners = new Map<string, (event: PointerEvent) => void>();
  vi.stubGlobal("window", {
    addEventListener: (name: string, listener: (event: PointerEvent) => void) => listeners.set(name, listener),
    removeEventListener: (name: string) => listeners.delete(name),
    setTimeout: (callback: () => void) => callback(),
  });
  const emitted: Array<[string, unknown]> = [];
  const setup = module.exports.default.setup({ columns: {}, data: [] }, { expose: () => {}, emit: (name: string, value: unknown) => emitted.push([name, value]) });

  setup.startResize({ clientX: 100 } as PointerEvent, { key: "name", width: 120 });
  listeners.get("pointermove")?.({ clientX: 145 } as PointerEvent);
  listeners.get("pointerup")?.({} as PointerEvent);

  expect(emitted).toEqual([["column-resize", { key: "name", width: 165 }]]);
  vi.unstubAllGlobals();
});
