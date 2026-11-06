import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { describe, it, expect } from "vitest";

const filename = fileURLToPath(new URL("./fn-modal.vue", import.meta.url));
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const script = compileScript(descriptor, { id: "fn-modal-test", fs: { fileExists: existsSync, readFile: path => readFileSync(path, "utf8") } });
const compiled = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const require = createRequire(import.meta.url);
const module = { exports: {} as any };
const loadDependency = (name: string) => {
  if (name === "@lucide/vue" || name === "./fn-button.vue") {
    return {};
  }
  return require(name);
};
new Function("require", "module", "exports", compiled.outputText)(loadDependency, module, module.exports);

async function resolveFooter(props: Record<string, any>) {
  let footer: unknown;
  const component = {
    ...module.exports.default,
    render(this: any) {
      footer = this.$props.footer;
      return null;
    },
  };
  const { createRenderer, h } = require("vue");
  const renderer = createRenderer({
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    insert: () => {},
    remove: () => {},
    setText: () => {},
    setElementText: () => {},
    parentNode: () => null,
    nextSibling: () => null,
    patchProp: () => {},
  });
  const app = renderer.createApp({ render: () => h(component, props) });
  app.mount({});
  app.unmount();
  return footer;
}

describe("FnModal footer 默认值", () => {
  it("按钮配置覆盖默认按钮，保留未配置的取消和重置", () => {
    const props = { buttons: { confirm: { text: "保存", danger: true } }, confirmLoading: true };
    const setup = module.exports.default.setup(props, { expose: () => {}, emit: () => {} });
    expect(setup.buttonProps.value.reset.text).toBe("重置");
    expect(setup.buttonProps.value.cancel.text).toBe("取消");
    expect(setup.buttonProps.value.confirm).toMatchObject({ text: "保存", danger: true, type: "primary", loading: true });
  });
  it("未配置 footer 时不能被 Vue Boolean prop 自动转成 false", async () => {
    expect(await resolveFooter({})).toBeUndefined();
  });
  it("显式 false/null 仍然隐藏 footer", async () => {
    expect(await resolveFooter({ footer: false })).toBe(false);
    expect(await resolveFooter({ footer: null })).toBeNull();
  });
});
