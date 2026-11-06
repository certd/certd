import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { describe, it, expect, vi } from "vitest";

const filename = fileURLToPath(new URL("./fn-button.vue", import.meta.url));
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const script = compileScript(descriptor, { id: "fn-button-test", fs: { fileExists: existsSync, readFile: path => readFileSync(path, "utf8") } });
const compiled = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const require = createRequire(import.meta.url);
const module = { exports: {} as any };
const loadDependency = (name: string) => {
  if (name === "@lucide/vue" || name === "./fn-icon.vue") {
    return {};
  }
  return require(name);
};
new Function("require", "module", "exports", compiled.outputText)(loadDependency, module, module.exports);

describe("FnButton 点击上下文", () => {
  it("将真实行上下文传给操作按钮", () => {
    const context = { type: "row", row: { id: 12 }, index: 0 };
    const onClick = vi.fn();
    const setup = module.exports.default.setup({ context, onClick }, { expose: () => {}, emit: () => {} });
    setup.handleClick();
    expect(onClick).toHaveBeenCalledWith(context);
  });
  it("未传上下文时保持默认行为", () => {
    const click = vi.fn();
    const setup = module.exports.default.setup({ click }, { expose: () => {}, emit: () => {} });
    setup.handleClick();
    expect(click).toHaveBeenCalledWith({ type: "row" });
  });
});
