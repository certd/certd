import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { expect, it, vi } from "vitest";

const filename = fileURLToPath(new URL("./fn-column-settings.vue", import.meta.url));
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const script = compileScript(descriptor, { id: "fn-column-settings-test", fs: { fileExists: existsSync, readFile: path => readFileSync(path, "utf8") } });
const compiled = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const require = createRequire(import.meta.url);
const module = { exports: {} as any };
const loadDependency = (name: string) => {
  if (name === "@lucide/vue" || name === "./fn-drawer.vue" || name === "./fn-button.vue") return {};
  return require(name);
};
new Function("require", "module", "exports", compiled.outputText)(loadDependency, module, module.exports);

function reorder(columns: Array<{ key: string; fixed?: "left" | "right" }>, sourceKey: string, targetKey: string) {
  const setup = module.exports.default.setup({ modelValue: true, columns: columns.map(column => ({ ...column, title: column.key, show: true })) }, { emit: vi.fn(), expose: () => {} });
  setup.draggingKey.value = sourceKey;
  setup.dropColumn(targetKey);
  return setup.rows.value.map((column: { key: string }) => column.key);
}

function setFixed(columns: Array<{ key: string; fixed?: "left" | "right" }>, sourceKey: string, fixed: "left" | "right" | undefined) {
  const setup = module.exports.default.setup({ modelValue: true, columns: columns.map(column => ({ ...column, title: column.key, show: true })) }, { emit: vi.fn(), expose: () => {} });
  const column = setup.rows.value.find((item: { key: string }) => item.key === sourceKey);
  setup.setFixed(column, fixed);
  return setup.rows.value.map((item: { key: string; fixed?: string }) => ({ key: item.key, fixed: item.fixed }));
}

it("右固定列只能在右固定列之间拖动排序", () => {
  expect(reorder([{ key: "normal" }, { key: "rightA", fixed: "right" }, { key: "rightB", fixed: "right" }], "rightB", "rightA")).toEqual(["normal", "rightB", "rightA"]);
  expect(reorder([{ key: "normal" }, { key: "rightA", fixed: "right" }, { key: "rightB", fixed: "right" }], "rightB", "normal")).toEqual(["normal", "rightA", "rightB"]);
});

it("点击右固定将列插入首个右固定列之前", () => {
  expect(setFixed([{ key: "rightA", fixed: "right" }, { key: "rightB", fixed: "right" }, { key: "normal" }], "normal", "right")).toEqual([
    { key: "normal", fixed: "right" },
    { key: "rightA", fixed: "right" },
    { key: "rightB", fixed: "right" },
  ]);
});

it("取消右固定时将列放到剩余右固定列之前", () => {
  expect(setFixed([{ key: "rightA", fixed: "right" }, { key: "normal" }, { key: "rightB", fixed: "right" }], "rightA", undefined)).toEqual([
    { key: "normal", fixed: undefined },
    { key: "rightA", fixed: undefined },
    { key: "rightB", fixed: "right" },
  ]);
});
