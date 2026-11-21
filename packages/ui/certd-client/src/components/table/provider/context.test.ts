import { describe, expect, it, vi } from "vitest";
import { fnCrudContext, UiContext } from "./context";
import { installFnCrud } from "../use/use-fn-crud";

describe("Fn UI contexts", () => {
  it("initializes default notification and message services", () => {
    const context = new UiContext();

    expect(context.getServices().notification).toBe(context.getServices().message);
    context.getServices().notification.error({ message: "请求失败" });
    expect(context.notificationItems.value[0]).toMatchObject({ type: "error", message: "请求失败" });
  });

  it("installs common CRUD options through installFnCrud", () => {
    const commonOptions = { pagination: { pageSize: 25 } };
    installFnCrud({ commonOptions: () => commonOptions });

    expect(fnCrudContext.getCommonOptions()).toBe(commonOptions);
    fnCrudContext.configure({ commonOptions: () => ({}) });
  });

  it("allows the AntDV adapter to replace UI services", () => {
    const context = new UiContext();
    const services = { notification: { success: vi.fn(), error: vi.fn() }, message: { success: vi.fn(), error: vi.fn() } };

    context.setServices(services);

    expect(context.getServices()).toBe(services);
  });
});
