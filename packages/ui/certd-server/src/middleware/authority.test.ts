/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { Constants } from "@certd/lib-server";
import { AuthorityMiddleware } from "./authority.js";

function createMiddleware(permission: string) {
  const middleware = new AuthorityMiddleware();
  middleware.secret = "test-secret";
  middleware.webRouterService = {
    async getMatchedRouterInfo() {
      return { description: permission, summary: "测试路由" };
    },
  } as any;
  middleware.userService = {
    async findOne() {
      return { id: 1, status: 1 };
    },
  } as any;
  return middleware;
}

function createCtx(token?: string) {
  return {
    path: "/api/basic/file/download",
    method: "GET",
    query: token ? { token } : {},
    headers: {},
    get() {
      return "";
    },
  } as any;
}

describe("AuthorityMiddleware guestOptionalAuth", () => {
  it("continues without user when token is not provided", async () => {
    const middleware = createMiddleware(Constants.per.guestOptionalAuth);
    const ctx = createCtx();
    let called = false;

    await middleware.resolve()(ctx, async () => {
      called = true;
    });

    assert.equal(called, true);
    assert.equal(ctx.user, undefined);
    assert.equal(ctx.auditRouteInfo.summary, "测试路由");
  });

  it("sets user when token is provided", async () => {
    const middleware = createMiddleware(Constants.per.guestOptionalAuth);
    const token = jwt.sign({ id: 1, roles: [1] }, middleware.secret);
    const ctx = createCtx(token);

    await middleware.resolve()(ctx, async () => {});

    assert.equal(ctx.user.id, 1);
    assert.deepEqual(ctx.user.roles, [1]);
  });
});

describe("AuthorityMiddleware token user", () => {
  it("rejects a token whose user does not exist", async () => {
    const middleware = createMiddleware(Constants.per.authOnly);
    middleware.userService.findOne = (async () => null) as any;
    const token = jwt.sign({ id: 1, roles: [1] }, middleware.secret);
    const ctx = createCtx(token);

    await middleware.resolve()(ctx, async () => {});

    assert.equal(ctx.status, 401);
  });

  it("rejects a token whose user is disabled", async () => {
    const middleware = createMiddleware(Constants.per.authOnly);
    middleware.userService.findOne = (async () => ({ id: 1, status: 0 })) as any;
    const token = jwt.sign({ id: 1, roles: [1] }, middleware.secret);
    const ctx = createCtx(token);

    await middleware.resolve()(ctx, async () => {});

    assert.equal(ctx.status, 401);
  });
});

describe("AuthorityMiddleware scoped token", () => {
  it("rejects a scoped token outside its API prefix", async () => {
    const middleware = createMiddleware(Constants.per.authOnly);
    const ctx = createCtx();
    ctx.path = "/api/sys/plugin/find";
    const token = jwt.sign({ id: 1, roles: [1], scoped: ["sys/ai"] }, middleware.secret);
    ctx.get = (name: string) => (name === "Authorization" ? `Bearer ${token}` : "");
    let called = false;

    await middleware.resolve()(ctx, async () => {
      called = true;
    });

    assert.equal(called, false);
    assert.equal(ctx.status, 403);
  });

  it("allows a scoped token within its API prefix", async () => {
    const middleware = createMiddleware(Constants.per.authOnly);
    const ctx = createCtx();
    ctx.path = "/api/scoped/sys/ai/plugin/find";
    const token = jwt.sign({ id: 1, roles: [1], scoped: ["sys/ai"] }, middleware.secret);
    ctx.get = (name: string) => (name === "Authorization" ? `Bearer ${token}` : "");
    let called = false;

    await middleware.resolve()(ctx, async () => {
      called = true;
    });

    assert.equal(called, true);
  });
});
