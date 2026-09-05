/// <reference types="mocha" />

import assert from "node:assert/strict";
import { AuditLogContext } from "./audit.js";

// AuditLog decorator and getAuditLogOptions are removed since auditLog()
// now signals audit intent directly via ctx.auditLog.enabled

describe("AuditLogContext type", () => {
  it("supports enabled flag", () => {
    const ctx: AuditLogContext = {
      type: "pipeline",
      action: "删除流水线",
      append: ["ID:5"],
      content: "删除了流水线(ID:5)",
      projectId: 3,
      enabled: true,
    };

    assert.equal(ctx.enabled, true);
    assert.equal(ctx.type, "pipeline");
    assert.equal(ctx.content, "删除了流水线(ID:5)");
    assert.equal(ctx.projectId, 3);
  });

  it("works with minimal fields", () => {
    const ctx: AuditLogContext = {
      enabled: true,
      append: ["提交2条"],
    };

    assert.equal(ctx.enabled, true);
  });
});
