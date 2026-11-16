import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useTabsProps } from "./use";
import type { FnCrudOptions } from "../types/index";

describe("useTabsProps", () => {
  it("treats unloaded dictionary options as an empty list", () => {
    const props = {
      columns: {
        status: { key: "status", title: "状态", cell: { dict: { getOptions: () => ({ value: undefined }) } } },
      },
      request: { pageRequest: async () => ({ records: [], total: 0 }) },
      tabs: { refCol: "status" },
    } as unknown as FnCrudOptions;

    const result = useTabsProps(props, {}, ref({})).value;

    expect(result.tabs).toEqual([]);
    expect(result.slots).toBeUndefined();
  });
});
