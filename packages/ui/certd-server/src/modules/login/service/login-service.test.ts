import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { LoginService } from "./login-service.js";

function createLoginService() {
  const service = new LoginService();
  const calls: any = {
    register: [],
    bindInvitee: [],
    withTx: [],
  };
  const txManager = { tx: true };
  const newUser = { id: 1001, username: "new_user" };
  service.userService = {
    async register(type: string, user: any, withTx?: any) {
      calls.register.push({ type, user, withTx });
      user.id = newUser.id;
      if (withTx) {
        await withTx(txManager);
      }
      return newUser;
    },
  } as any;
  service.inviteService = {
    async bindInvitee(ctx: any, req: any) {
      calls.bindInvitee.push({ ctx, req });
      return { id: 1 };
    },
  } as any;
  return { service, calls, newUser, txManager };
}

describe("LoginService.register", () => {
  it("registers user and binds invite code after user creation", async () => {
    const { service, calls, newUser } = createLoginService();
    const registerUser = { username: "alice" } as any;

    const result = await service.register("username", registerUser, "ABC123");

    assert.equal(result, newUser);
    assert.equal(calls.register.length, 1);
    assert.equal(calls.register[0].type, "username");
    assert.equal(calls.register[0].user, registerUser);
    assert.equal(calls.bindInvitee.length, 1);
    assert.deepEqual(calls.bindInvitee[0].ctx, {});
    assert.deepEqual(calls.bindInvitee[0].req, {
      inviteeUserId: newUser.id,
      inviteCode: "ABC123",
    });
  });

  it("keeps registration successful when invite binding fails", async () => {
    const { service, calls, newUser } = createLoginService();
    service.inviteService = {
      async bindInvitee(ctx: any, req: any) {
        calls.bindInvitee.push({ ctx, req });
        throw new Error("invalid invite code");
      },
    } as any;

    const result = await service.register("username", { username: "alice" } as any, "BADCODE");

    assert.equal(result, newUser);
    assert.equal(calls.register.length, 1);
    assert.equal(calls.bindInvitee.length, 1);
  });

  it("keeps original registration transaction callback", async () => {
    const { service, calls, txManager } = createLoginService();

    await service.register("username", { username: "alice" } as any, "", async tx => {
      calls.withTx.push(tx);
    });

    assert.equal(calls.withTx.length, 1);
    assert.equal(calls.withTx[0], txManager);
    assert.equal(calls.bindInvitee.length, 0);
  });
});

describe("LoginService.generateScopedAccessToken", () => {
  it("adds the requested scopes to a short-lived JWT", async () => {
    const service = new LoginService();
    // 全局 jwt 过期时间大于受限令牌上限（6小时），验证受限令牌被截断到 6 小时
    (service as any).jwt = { expire: 8 * 60 * 60 };
    service.sysSettingsService = {
      async getSetting() {
        return { jwtKey: "test-secret" };
      },
    } as any;

    const result = await service.generateScopedAccessToken(
      {
        id: 1,
        username: "admin",
        roles: [1],
      },
      ["sys/ai"]
    );
    const payload = jwt.verify(result.token, "test-secret") as jwt.JwtPayload;

    assert.deepEqual(payload.scoped, ["sys/ai"]);
    // 受限令牌短时效：截断到 6 小时上限
    assert.equal(result.expire, 6 * 60 * 60);
  });
});
