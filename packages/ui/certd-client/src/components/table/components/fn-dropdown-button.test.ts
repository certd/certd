import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

const filename = fileURLToPath(new URL("./fn-dropdown-button.vue", import.meta.url));
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const script = compileScript(descriptor, { id: "fn-dropdown-button-test", fs: { fileExists: existsSync, readFile: path => readFileSync(path, "utf8") } });
const compiled = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const require = createRequire(import.meta.url);
const module = { exports: {} as any };
const loadDependency = (name: string) => {
  if (name === "vue") {
    return { ...require(name), inject: (key: string, defaultValue: unknown) => (key === "table-size" ? { value: { size: 12, density: "compact" } } : defaultValue) };
  }
  if (name === "@lucide/vue" || name === "./fn-icon.vue") return {};
  if (name === "../provider/context") return { fnTableSizeKey: "table-size" };
  return require(name);
};
new Function("require", "module", "exports", compiled.outputText)(loadDependency, module, module.exports);

describe("FnDropdownButton", () => {
  it("依据 FnTable 字号计算菜单字号、行高和位置", () => {
    vi.stubGlobal("window", { innerHeight: 500, innerWidth: 800 });
    const setup = module.exports.default.setup({ items: [] }, { emit: vi.fn(), expose: vi.fn() });
    setup.buttonRef.value = { getBoundingClientRect: () => ({ top: 10, bottom: 40, left: 10, right: 100 }) };

    setup.updateMenuPosition();

    expect(setup.menuSize.value).toBe("small");
    expect(setup.menuStyle.value).toMatchObject({ top: "45px", left: "8px", "--fn-button-menu-font-size": "12px", "--fn-button-menu-item-height": "30px" });
    vi.unstubAllGlobals();
  });

  it("点击菜单项时传递当前行上下文并发出选择事件", () => {
    const context = { type: "row", row: { id: 7 } };
    const onClick = vi.fn();
    const emit = vi.fn();
    const setup = module.exports.default.setup({ context }, { emit, expose: vi.fn() });

    setup.handleMenuClick({ key: "edit", label: "编辑", onClick });

    expect(onClick).toHaveBeenCalledWith(context);
    expect(emit).toHaveBeenCalledWith("select", "edit");
    expect(setup.menuOpen.value).toBe(false);
  });
});
