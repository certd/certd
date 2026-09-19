import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getMetadataArgsStorage } from "typeorm";
import { OpenKeyEntity } from "./open-key.js";

describe("OpenKeyEntity", () => {
  it("应映射密钥用途备注字段", () => {
    const remarkColumn = getMetadataArgsStorage().columns.find(column => {
      return column.target === OpenKeyEntity && column.propertyName === "remark";
    });

    assert.ok(remarkColumn);
    assert.equal(remarkColumn.options.name, "remark");
    assert.equal(remarkColumn.options.length, 512);
    assert.equal(remarkColumn.options.nullable, true);
  });
});
