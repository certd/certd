import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { expect, it } from "vitest";

const filename = fileURLToPath(new URL("./fn-pagination.vue", import.meta.url));
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const script = compileScript(descriptor, { id: "fn-pagination-test", fs: { fileExists: existsSync, readFile: path => readFileSync(path, "utf8") } });
const compiled = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const require = createRequire(import.meta.url);
const module = { exports: {} as any };
new Function("require", "module", "exports", compiled.outputText)(require, module, module.exports);

it("保留可配置分页模式、page size 选项并派发页码变更", () => {
  const changes: Array<[number, number]> = [];
  const component = module.exports.default;
  const props = component.props;
  const resolvedProps = component.setup(
    { current: 2, pageSize: 20, pageSizeOptions: ["10", "20"], simple: true, showQuickJumper: true, total: 51 },
    { emit: (_event: string, current: number, pageSize: number) => changes.push([current, pageSize]), expose: () => {} }
  );

  expect(props.showSizeChanger.default).toBe(true);
  expect(resolvedProps.paginationProps.value).toMatchObject({ current: 2, pageSize: 20, pageSizeOptions: ["10", "20"], simple: true, showQuickJumper: true, total: 51 });
  resolvedProps.changePage(3, 10);
  expect(changes).toEqual([[3, 10]]);
});
