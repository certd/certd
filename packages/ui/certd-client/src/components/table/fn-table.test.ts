import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { expect, it } from "vitest";

const filename = fileURLToPath(new URL("./fn-table.vue", import.meta.url));
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const script = compileScript(descriptor, { id: "fn-table-test", fs: { fileExists: existsSync, readFile: path => readFileSync(path, "utf8") } });
const compiled = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const require = createRequire(import.meta.url);
const module = { exports: {} as any };
const loadDependency = (name: string) => {
  if (name === "@lucide/vue" || name === "./fn-table-cell.vue") return {};
  return require(name);
};
new Function("require", "module", "exports", compiled.outputText)(loadDependency, module, module.exports);

it("rowHandle 默认排在末尾，显式 order 仍然有效", () => {
  const props = { crudColumns: { name: { title: "名称", cell: { order: 1 } }, id: { title: "ID", cell: { order: 2 } } }, rowHandle: {} };
  const setup = module.exports.default.setup(props, { expose: () => {}, emit: () => {} });
  expect(setup.columns.value.map(column => column.key)).toEqual(["name", "id", "rowHandle"]);
  const override = module.exports.default.setup({ ...props, rowHandle: { order: 0 } }, { expose: () => {}, emit: () => {} });
  expect(override.columns.value[0].key).toBe("rowHandle");
});
