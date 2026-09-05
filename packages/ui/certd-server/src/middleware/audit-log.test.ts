/// <reference types="mocha" />

import assert from "node:assert/strict";
import { Constants } from "@certd/lib-server";
import esmock from "esmock";

// 通过 esmock 加载被测模块并 mock 专业版判断（isPlus），无需在实现里加注入点
const { AuditLogMiddleware } = await esmock("./audit-log.js", {
  "@certd/plus-core": {
    isPlus: () => true,
  },
});

class TestController {
  import() {}

  noAudit() {}

  getAuditType(): string {
    return "pipeline";
  }
}

function createMiddleware() {
  const middleware = new AuditLogMiddleware();
  const records: any[] = [];
  middleware.auditService = {
    async log(record: any) {
      records.push(record);
    },
  } as any;
  return { middleware, records };
}

function createCtx(method = "import") {
  return {
    path: "/api/pi/cname/record/import",
    status: 200,
    body: Constants.res.success,
    ip: "127.0.0.1",
    user: { id: 1, username: "admin" },
    projectId: 3,
    request: {
      query: { id: "5" },
      body: { name: "test" },
    },
    requestContext: {
      async getAsync() {
        return new TestController();
      },
    },
    auditRouteInfo: {
      controllerClz: TestController,
      method,
      summary: "导入CNAME记录",
    },
    auditLog: {
      enabled: true,
      append: ["提交2条"],
    },
  } as any;
}

describe("AuditLogMiddleware", () => {
  it("writes audit log after successful response", async () => {
    const { middleware, records } = createMiddleware();

    await middleware.resolve()(createCtx(), async () => {});

    assert.equal(records.length, 1);
    assert.equal(records[0].userId, 1);
    assert.equal(records[0].type, "pipeline");
    assert.equal(records[0].action, "导入CNAME记录");
    assert.equal(records[0].content, "提交2条");
    assert.equal(records[0].username, "admin");
    assert.equal(records[0].projectId, 3);
    assert.equal(records[0].ipAddress, "127.0.0.1");
    assert.equal(records[0].scope, "user");
  });

  it("uses bean type and action overrides", async () => {
    const { middleware, records } = createMiddleware();
    const ctx = createCtx();
    ctx.auditLog = { enabled: true, type: "settings", action: "修改设置", append: ["修改了安全设置"] };

    await middleware.resolve()(ctx, async () => {});

    assert.equal(records[0].type, "settings");
    assert.equal(records[0].action, "修改设置");
    assert.equal(records[0].content, "修改了安全设置");
  });

  it("skips when auditLog not enabled", async () => {
    const { middleware, records } = createMiddleware();
    const ctx = createCtx("noAudit");
    ctx.auditLog = {};

    await middleware.resolve()(ctx, async () => {});

    assert.equal(records.length, 0);
  });

  it("writes audit log with success=false on failed response", async () => {
    const { middleware, records } = createMiddleware();
    const ctx = createCtx();
    ctx.body = Constants.res.error;

    await middleware.resolve()(ctx, async () => {});

    assert.equal(records.length, 1);
    assert.equal(records[0].success, false);
  });

  it("skips anonymous request", async () => {
    const { middleware, records } = createMiddleware();
    const ctx = createCtx();
    ctx.user = undefined;

    await middleware.resolve()(ctx, async () => {});

    assert.equal(records.length, 0);
  });
});
