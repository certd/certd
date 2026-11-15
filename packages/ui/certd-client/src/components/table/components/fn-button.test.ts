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

  it("使用按钮的静态属性并把当前行 context 传给回调", () => {
    const context = { type: "row", row: { status: "pending" } };
    const setup = module.exports.default.setup(
      {
        context,
        show: true,
        text: "审核",
        disabled: false,
        loading: false,
      },
      { expose: () => {}, emit: () => {} }
    );

    expect(setup.resolvedProps.value).toMatchObject({ show: true, text: "审核", disabled: false });
    expect(setup.buttonClasses.value["fn-button-disabled"]).toBe(false);
  });

  it("支持 danger、禁用状态和自定义主色", () => {
    const click = vi.fn();
    const setup = module.exports.default.setup({ type: "default", danger: true, disabled: true, primaryColor: "#4c63ff", onClick: click }, { expose: () => {}, emit: () => {} });
    setup.handleClick();
    expect(setup.buttonClasses.value).toMatchObject({ "fn-button-default": true, "fn-button-danger": true, "fn-button-disabled": true });
    expect(setup.buttonStyle.value["--fn-button-primary"]).toBe("#4c63ff");
    expect(click).not.toHaveBeenCalled();
  });

  it("默认圆角形状不会覆盖 primary 按钮类型", () => {
    const setup = module.exports.default.setup({ type: "primary", shape: "default" }, { expose: () => {}, emit: () => {} });
    expect(setup.buttonClasses.value).toMatchObject({ "fn-button-primary": true, "fn-button-shape-default": true });
    expect(setup.buttonClasses.value["fn-button-default"]).toBeUndefined();
  });
});
