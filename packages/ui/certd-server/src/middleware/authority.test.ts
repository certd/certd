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
      return { description: permission };
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
