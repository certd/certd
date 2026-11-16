import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { expect, it, vi } from "vitest";
import { compute, resolveComputedValue } from "../crud/compute";

const filename = fileURLToPath(new URL("./fn-form-dialog.vue", import.meta.url));
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const script = compileScript(descriptor, { id: "fn-form-dialog-test", fs: { fileExists: existsSync, readFile: path => readFileSync(path, "utf8") } });
const compiled = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const require = createRequire(import.meta.url);
const module = { exports: {} as any };
const loadDependency = (name: string) => {
  if (name === "../modal/fn-modal.vue" || name === "./fn-form.vue") return {};
  if (name === "../crud/compute") return { resolveComputedValue };
  if (name === "../use") return { useFnUiServices: () => ({ notification: { error: vi.fn() }, message: { error: vi.fn() } }) };
  return require(name);
};
new Function("require", "module", "exports", compiled.outputText)(loadDependency, module, module.exports);

it("动态表单配置使用 formDialog context，并保留取消回调", async () => {
  const setup = module.exports.default.setup({}, { expose: () => {} });
  const form = { kind: "user" };
  const cancel = vi.fn();
  setup.open({
    mode: "edit",
    initialForm: form,
    columns: {
      kind: compute(({ form: values, dialog, type }) => ({
        component: {
          name: `${type}-${values?.kind}-${dialog?.open.value ? "open" : "closed"}`,
        },
      })),
    },
    dialog: { buttons: { cancel: { onClick: cancel } } },
  });
  setup.formRef.value = {
    getContext: () => ({ type: "form", form, mode: "edit", columns: {} }),
    getForm: () => form,
    validate: async () => true,
    reset: () => form,
  };

  expect(setup.resolvedForm.value.columns.kind.component.name).toBe("form-user-closed");
  await setup.cancelForm();
  expect(cancel).toHaveBeenCalledOnce();
});

it("弹窗 ref 创建前调用 close 会结束当前表单流程", async () => {
  const setup = module.exports.default.setup({}, { expose: () => {} });
  const result = setup.open({ columns: {} });

  setup.close();

  await expect(result).resolves.toBeUndefined();
});

it("在 FnFormDialog context 中计算 FnCrud 的动态表单选项", async () => {
  const setup = module.exports.default.setup({}, { expose: () => {} });
  const result = setup.open(
    {
      columns: {},
      mode: "edit",
      initialForm: { name: "certd" },
    },
    compute(({ form, mode }) => ({ title: `${mode}:${form?.name}` }))
  );

  expect(setup.resolvedForm.value.title).toBe("edit:certd");
  expect(setup.resolvedForm.value.dialog.title).toBe("edit:certd");
  setup.close();
  await expect(result).resolves.toBeUndefined();
});
