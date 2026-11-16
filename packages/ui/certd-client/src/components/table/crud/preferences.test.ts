import { afterEach, expect, it, vi } from "vitest";
import { createFnCrudPreferenceSnapshot, createFnCrudPreferenceStorage, getFnCrudPreferenceKey, mergeFnCrudPreferences, type FnCrudPreferences } from "./preferences";

afterEach(() => {
  vi.restoreAllMocks();
});

it("prefers explicit CRUD id and resolves Vue hash routes as the fallback key", () => {
  expect(getFnCrudPreferenceKey("accounts", "https://certd.local/#/sys/accounts?tab=all")).toBe("fn-crud:accounts");
  expect(getFnCrudPreferenceKey(undefined, "https://certd.local/#/sys/accounts?tab=all")).toBe("fn-crud:/sys/accounts");
});

it("merges saved columns with current defaults and ignores removed columns", () => {
  const defaults = {
    id: { key: "id", title: "ID", cell: { width: 80, order: 0 } },
    name: { key: "name", title: "名称", cell: { width: 160, order: 1 } },
    status: { key: "status", title: "状态", cell: { order: 2 } },
  };
  const saved: FnCrudPreferences = {
    columns: {
      id: { order: 0, show: true, width: 90 },
      name: { order: 2, show: false, fixed: "right", width: 220 },
      deleted: { order: 1, show: true },
    },
    pageSize: 50,
    density: "compact",
  };

  expect(mergeFnCrudPreferences(defaults, saved)).toEqual({
    id: { key: "id", title: "ID", cell: { width: 90, order: 0, show: true }, show: true },
    name: { key: "name", title: "名称", cell: { width: 220, order: 2, fixed: "right", show: false }, show: false },
    status: { key: "status", title: "状态", cell: { order: 2 } },
  });
});

it("stores column state, resized widths, page size, and density in one snapshot", () => {
  const snapshot = createFnCrudPreferenceSnapshot(
    {
      id: { key: "id", title: "ID", cell: { order: 2, fixed: "left" } },
      name: { key: "name", title: "名称", show: false, cell: { order: 1 } },
    },
    { id: 96 },
    50,
    "compact"
  );

  expect(snapshot).toEqual({
    columns: {
      id: { order: 2, show: true, fixed: "left", width: 96 },
      name: { order: 1, show: false, fixed: null, width: undefined },
    },
    pageSize: 50,
    density: "compact",
  });
});

it("uses localStorage by default and delegates full snapshots to remote get/set", async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  const snapshot: FnCrudPreferences = { columns: {}, pageSize: 20, density: "comfort" };
  const local = createFnCrudPreferenceStorage();
  await local.set("fn-crud:/path", snapshot);
  expect(await local.get("fn-crud:/path")).toEqual(snapshot);
  await local.remove("fn-crud:/path");
  expect(await local.get("fn-crud:/path")).toBeUndefined();

  const remote = { get: vi.fn(async () => snapshot), set: vi.fn(async (_key: string, value: FnCrudPreferences) => value) };
  const storage = createFnCrudPreferenceStorage(remote);
  expect(await storage.get("fn-crud:/path")).toEqual(snapshot);
  await storage.set("fn-crud:/path", snapshot);
  expect(remote.get).toHaveBeenCalledWith("fn-crud:/path");
  expect(remote.set).toHaveBeenCalledWith("fn-crud:/path", snapshot);

  const offline = createFnCrudPreferenceStorage({
    get: async () => {
      throw new Error("offline");
    },
    set: async () => undefined,
  });
  expect(await offline.get("fn-crud:/path")).toEqual(snapshot);
});
