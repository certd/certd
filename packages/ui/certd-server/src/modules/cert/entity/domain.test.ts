import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getMetadataArgsStorage } from "typeorm";
import { DomainEntity } from "./domain.js";

describe("DomainEntity", () => {
  it("应映射域名备注字段", () => {
    const remarkColumn = getMetadataArgsStorage().columns.find(column => {
      return column.target === DomainEntity && column.propertyName === "remark";
    });

    assert.ok(remarkColumn);
    assert.equal(remarkColumn.options.name, "remark");
  });
});
