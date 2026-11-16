import { describe, expect, it } from "vitest";
import { deepClone, deepMerge } from "./merge";

describe("FnCrud configuration merge", () => {
  it("deep clones nested arrays and objects without cloning functions", () => {
    const callback = () => undefined;
    const source = { nested: { value: 1 }, list: [{ value: 2 }], callback };

    const clone = deepClone(source);

    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(clone.nested).not.toBe(source.nested);
    expect(clone.list).not.toBe(source.list);
    expect(clone.list[0]).not.toBe(source.list[0]);
    expect(clone.callback).toBe(callback);
  });

  it("recursively merges objects, replaces arrays and prefers local values without mutating inputs", () => {
    const defaults = { table: { minWidth: 800, rowKey: "id" }, buttons: ["create", "edit"] };
    const local = { table: { minWidth: 600 }, buttons: ["create"] };

    const result = deepMerge(defaults, local);

    expect(result).toEqual({ table: { minWidth: 600, rowKey: "id" }, buttons: ["create"] });
    expect(result).not.toBe(defaults);
    expect(defaults.table.minWidth).toBe(800);
    expect(defaults.buttons).toEqual(["create", "edit"]);
  });
});
