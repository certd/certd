/// <reference types="mocha" />

import assert from "node:assert/strict";
import { Constants } from "@certd/lib-server";
import esmock from "esmock";
import { getAuditIpKey } from "../modules/sys/enterprise/service/audit-service.js";

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

describe("AuditLogMiddleware user login IP notification", () => {
  function createLoginMiddleware(userId: number) {
    const { middleware, records } = createMiddleware();
    const notifications: any[] = [];
    const historyChecks: any[] = [];
    middleware.auditService.isUnusualLoginIp = async (req: any) => {
      historyChecks.push(req);
      assert.equal(records.length, 0, "检测必须先于本次登录审计写入");
      return true;
    };
    middleware.userService = { findOne: async () => ({ id: userId, username: "alice", email: "alice@example.invalid" }) };
    middleware.notificationService = {
      getBindUrl: async () => "http://localhost/#/cert/audit",
      send: async (req: any, receiverId: number) => notifications.push({ req, receiverId, auditCount: records.length }),
    };
    const ctx = createCtx();
    ctx.method = "POST";
    ctx.path = "/api/login";
    ctx.ip = `198.51.100.${userId}`;
    ctx.user = undefined;
    ctx.body = { code: 0, data: { userId, username: "alice" } };
    ctx.auditLog = { enabled: true, userId, username: "alice", type: "login", content: "登录成功" };
    return { middleware, records, notifications, historyChecks, ctx };
  }

  it("先记录用户级登录警告并发送通知，再写正常登录审计", async () => {
    const { middleware, records, notifications, historyChecks, ctx } = createLoginMiddleware(71);
    await middleware.resolve()(ctx, async () => {});
    assert.deepEqual(historyChecks, [{ userId: 71, ipKey: getAuditIpKey(ctx.ip) }]);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].receiverId, 71);
    assert.equal(notifications[0].req.useDefault, true);
    assert.equal(notifications[0].auditCount, 1);
    assert.equal(notifications[0].req.emailAddress, "alice@example.invalid");
    assert.equal(notifications[0].req.body.title, "非常用 IP 登录警告");
    assert.match(notifications[0].req.body.content, /此前 30 天/);
    assert.equal(records.length, 2);
    assert.equal(records[0].type, "login");
    assert.equal(records[0].action, "非常用 IP 登录警告");
    assert.equal(records[0].userId, 71);
    assert.equal(records[0].scope, "user");
    assert.equal(records[0].ipAddress, "198.51.100.71");
    assert.match(records[0].content, /非常用 IP 登录/);
    assert.equal(records[1].type, "login");
  });

  it("向通知服务提供默认渠道和账号邮箱回退参数", async () => {
    const { middleware, notifications, ctx } = createLoginMiddleware(72);
    await middleware.resolve()(ctx, async () => {});
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].req.useDefault, true);
    assert.equal(notifications[0].req.useEmail, true);
    assert.equal(notifications[0].req.emailAddress, "alice@example.invalid");
  });

  it("does not notify for a known IP or a user without a baseline", async () => {
    const { middleware, records, notifications, ctx } = createLoginMiddleware(73);
    middleware.auditService.isUnusualLoginIp = async () => false;
    await middleware.resolve()(ctx, async () => {});
    assert.equal(notifications.length, 0);
    assert.equal(records.length, 1);
  });

  it("登录抛出异常时不检查 IP，正常记录失败审计并继续抛出异常", async () => {
    const { middleware, records, notifications, historyChecks, ctx } = createLoginMiddleware(74);
    await assert.rejects(
      middleware.resolve()(ctx, async () => {
        throw new Error("login failed");
      }),
      /login failed/
    );
    assert.equal(records.length, 1);
    assert.equal(records[0].success, false);
    assert.equal(historyChecks.length, 0);
    assert.equal(notifications.length, 0);
  });

  it("未完成登录且没有用户 ID 时不检查 IP", async () => {
    const { middleware, records, notifications, historyChecks, ctx } = createLoginMiddleware(74);
    ctx.body = { code: 0, data: { bindRequired: true } };
    ctx.auditLog = undefined;
    await middleware.resolve()(ctx, async () => {});
    assert.equal(records.length, 0);
    assert.equal(historyChecks.length, 0);
    assert.equal(notifications.length, 0);
  });

  it("短信、双因素、Passkey 和 OAuth 成功登录都检查用户 IP", async () => {
    const paths = ["/api/loginBySms", "/api/loginByTwoFactor", "/api/loginByPasskey", "/api/oauth/token", "/api/oauth/autoRegister"];
    for (const path of paths) {
      const { middleware, notifications, historyChecks, ctx } = createLoginMiddleware(78);
      ctx.path = path;
      await middleware.resolve()(ctx, async () => {});
      assert.equal(historyChecks.length, 1, path);
      assert.equal(notifications.length, 1, path);
    }
  });

  it("保存和触发流水线时用已认证用户的 ID 检查 IP", async () => {
    for (const path of ["/api/pi/pipeline/save", "/api/pi/pipeline/trigger"]) {
      const { middleware, notifications, historyChecks, ctx } = createLoginMiddleware(82);
      ctx.path = path;
      ctx.user = { id: 82, username: "alice" };
      ctx.body = { code: 0, data: { id: 77 } };
      ctx.auditLog = { enabled: true, type: "pipeline", content: "保存或执行流水线" };
      await middleware.resolve()(ctx, async () => {});
      assert.deepEqual(historyChecks, [{ userId: 82, ipKey: getAuditIpKey(ctx.ip) }]);
      assert.equal(notifications[0].receiverId, 82);
    }
  });

  it("HTTP 失败或非 POST 请求不检查 IP", async () => {
    const { middleware, historyChecks, ctx } = createLoginMiddleware(79);
    ctx.status = 401;
    await middleware.resolve()(ctx, async () => {});
    ctx.status = 200;
    ctx.method = "GET";
    await middleware.resolve()(ctx, async () => {});
    assert.equal(historyChecks.length, 0);
  });

  it("非 Plus 不查询 IP、不发送通知、不写审计", async () => {
    const { AuditLogMiddleware: FreeMiddleware } = await esmock("./audit-log.js", { "@certd/plus-core": { isPlus: () => false } });
    const { ctx } = createLoginMiddleware(80);
    const middleware = new FreeMiddleware();
    // 不提供任何业务依赖，确保非 Plus 在访问依赖前直接返回。
    await middleware.resolve()(ctx, async () => {});
  });

  it("通知发送失败时保留登录警告和正常登录审计", async () => {
    const { middleware, records, ctx } = createLoginMiddleware(75);
    middleware.notificationService.send = async () => {
      throw new Error("send failed");
    };
    await middleware.resolve()(ctx, async () => {});
    assert.equal(records.length, 2);
    assert.equal(records[0].type, "login");
    assert.equal(records[0].action, "非常用 IP 登录警告");
    assert.equal(records[0].success, true);
    assert.equal(records[1].content, "登录成功");
    assert.equal(records[1].success, true);
  });

  it("并发登录各自检查 IP，不等待其他登录的提醒处理", async () => {
    const { middleware, records, notifications, historyChecks, ctx } = createLoginMiddleware(76);
    const handler = middleware.resolve();
    await Promise.all([handler(ctx, async () => {}), handler(ctx, async () => {})]);
    assert.equal(historyChecks.length, 2);
    assert.equal(notifications.length, 2);
    assert.equal(records.filter(record => record.action === "非常用 IP 登录警告").length, 2);
  });

  it("未配置邮箱时仍记录警告，由通知服务处理用户默认渠道", async () => {
    const { middleware, records, notifications, ctx } = createLoginMiddleware(77);
    middleware.userService.findOne = async () => ({ id: 77, username: "alice", email: "" });
    await middleware.resolve()(ctx, async () => {});
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].req.useDefault, true);
    assert.equal(notifications[0].req.emailAddress, "");
    assert.equal(records.length, 2);
    assert.equal(records[0].action, "非常用 IP 登录警告");
  });
});
