import { describe, expect, it } from "vitest";
import { computed, reactive } from "vue";
import { compute, resolveComputed, resolveComputedValue } from "./compute";

describe("fn-crud compute", () => {
  it("resolves explicitly marked values at any nested depth", () => {
    const config = {
      component: {
        url: compute(({ form }) => `/api/${form?.provider}/options`),
      },
      onClick: () => "callback",
    };

    const resolved = resolveComputedValue(config, { type: "form", form: { provider: "dns" } });

    expect(resolved.component.url).toBe("/api/dns/options");
    expect(resolved.onClick).toBe(config.onClick);
  });

  it("tracks reactive values read by the compute callback", () => {
    const form = reactive({ provider: "dns" });
    const resolved = resolveComputed(
      () => ({ url: compute(({ form: values }) => `/api/${values?.provider}`) }),
      () => ({ type: "form", form })
    );

    expect(resolved.value.url).toBe("/api/dns");
    form.provider = "access";
    expect(resolved.value.url).toBe("/api/access");
  });
});
