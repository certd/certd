import assert from "node:assert/strict";
import { AcmeAccessMiddleware } from "./acme-access.js";

declare const describe: any;
declare const it: any;

function makeCtx(path: string, calls: any[]) {
  const service = {
    assertAccess: async (ctx: any, caId: number, opts: any) => {
      calls.push({ type: "assertAccess", caId, opts });
    },
    assertBootstrapRateLimit: async (ctx: any, caId: number) => {
      calls.push({ type: "rateLimit", caId });
    },
    respondError: (ctx: any, problem: any) => {
      calls.push({ type: "error", problem });
    },
  };
  return {
    path,
    requestContext: { getAsync: async () => service },
    set: () => {},
    get: () => "",
    req: { socket: { remoteAddress: "127.0.0.1" } },
  };
}

async function run(path: string) {
  const calls: any[] = [];
  const mw = new AcmeAccessMiddleware().resolve();
  let nextCalled = false;
  await mw(makeCtx(path, calls) as any, async () => {
    nextCalled = true;
  });
  return { calls, nextCalled };
}

describe("ACME访问门禁路径规范化", () => {
  it("小写规范路径执行门禁", async () => {
    const { calls } = await run("/api/acme/123/directory");
    assert.ok(calls.some(c => c.type === "assertAccess" && c.caId === 123));
  });

  it("大小写变体不匹配门禁正则（与路由大小写敏感一致，路由层返回404）", async () => {
    for (const path of ["/API/ACME/123/directory", "/Api/Acme/123/directory", "/api/ACME/123/directory"]) {
      const { calls, nextCalled } = await run(path);
      assert.equal(calls.length, 0, path + " 不应触发门禁（路由层不匹配）");
      assert.ok(nextCalled, path + " 交由路由层处理（404）");
    }
  });

  it("URL编码caId被解码后执行门禁", async () => {
    const { calls } = await run("/api/acme/%31%32%33/directory");
    assert.ok(calls.some(c => c.type === "assertAccess" && c.caId === 123));
  });

  it("非规范数字段（前导0）被拒绝", async () => {
    const { calls } = await run("/api/acme/0123/directory");
    assert.ok(calls.some(c => c.type === "error"));
  });

  it("引导端点触发限速", async () => {
    for (const ep of ["directory", "new-nonce", "new-account"]) {
      const { calls } = await run(`/api/acme/123/${ep}`);
      assert.ok(calls.some(c => c.type === "rateLimit" && c.caId === 123), ep);
    }
  });

  it("非ACME路径不触发门禁", async () => {
    const { calls, nextCalled } = await run("/api/sys/local-ca/page");
    assert.equal(calls.length, 0);
    assert.ok(nextCalled);
  });
});