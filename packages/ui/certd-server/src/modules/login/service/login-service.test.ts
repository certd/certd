import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import esmock from "esmock";
import { LoginService } from "./login-service.js";
import { cache } from "@certd/basic";

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

describe("LoginService.loginByPassword oauthOnly grace period", () => {
  const originalUptime = process.uptime;

  afterEach(() => {
    process.uptime = originalUptime;
  });

  function createPasswordLoginService(oauthOnly: boolean) {
    const service = new LoginService();
    (service as any).jwt = { expire: 3600 };
    service.sysSettingsService = {
      async getPublicSettings() {
        return { oauthOnly };
      },
      async getSetting() {
        return { jwtKey: "test-secret" };
      },
    } as any;
    service.userService = {
      async findOne() {
        return {
          id: 1,
          username: "alice",
          password: "hash",
          passwordVersion: 1,
          status: 1,
        };
      },
      async checkPassword() {
        return true;
      },
    } as any;
    service.roleService = {
      async getRoleIdsByUserId() {
        return [];
      },
    } as any;
    service.twoFactorService = {
      async getSetting() {
        return { authenticator: { enabled: false } };
      },
    } as any;
    return service;
  }

  it("allows password login during the first ten minutes after startup", async () => {
    process.uptime = () => 10 * 60 - 1;
    const service = createPasswordLoginService(true);

    const result = await service.loginByPassword({ username: "alice", password: "password", phoneCode: "86" });

    assert.equal(result.userId, 1);
  });

  it("rejects password login when the ten-minute startup window has elapsed", async () => {
    process.uptime = () => 10 * 60;
    const service = createPasswordLoginService(true);

    await assert.rejects(
      () => service.loginByPassword({ username: "alice", password: "password", phoneCode: "86" }),
      (error: any) => error?.message === "当前站点仅允许第三方登录，如果需要使用密码登录，请在服务重启后的前10分钟内登录"
    );
  });

  it("keeps password login available after ten minutes when oauthOnly is disabled", async () => {
    process.uptime = () => 10 * 60;
    const service = createPasswordLoginService(false);

    const result = await service.loginByPassword({ username: "alice", password: "password", phoneCode: "86" });

    assert.equal(result.userId, 1);
  });
});

describe("LoginService.checkTwoFactorEnabled", () => {
  it("requires 2FA only when authenticator and login settings are enabled", async () => {
    const { LoginService: PlusLoginService } = await esmock("./login-service.js", {
      "@certd/plus-core": { isPlus: () => true },
    });
    const service = new PlusLoginService();
    service.twoFactorService = {
      async getSetting() {
        return { authenticator: { enabled: true }, loginEnabled: true };
      },
    } as any;

    await assert.rejects(() => service.checkTwoFactorEnabled(1), /已开启多重认证/);

    service.twoFactorService = {
      async getSetting() {
        return { authenticator: { enabled: true }, loginEnabled: false };
      },
    } as any;
    await assert.doesNotReject(() => service.checkTwoFactorEnabled(1));

    service.twoFactorService = {
      async getSetting() {
        return { authenticator: { enabled: false }, loginEnabled: true };
      },
    } as any;
    await assert.doesNotReject(() => service.checkTwoFactorEnabled(1));

    service.twoFactorService = {
      async getSetting() {
        return { authenticator: { enabled: true } };
      },
    } as any;
    await assert.rejects(() => service.checkTwoFactorEnabled(1), /已开启多重认证/);
  });
});


describe("LoginService 两步验证 Passkey", () => {
  async function createPlusService() {
    const { LoginService: PlusLoginService } = await esmock("./login-service.js", {
      "@certd/plus-core": { isPlus: () => true },
    });
    const service = new PlusLoginService();
    service.sysSettingsService = { async getPublicSettings() { return { passkeyEnabled: true } as any; } } as any;
    return service;
  }

  it("生成选项绑定登录用户与login2fa用途", async () => {
    const service = await createPlusService();
    cache.set("login_2fa_code:login-passkey-1", 11, { ttl: 60000 });
    let captured: any;
    service.passkeyService = {
      async generateAuthenticationOptions(_ctx: any, opts: any) {
        captured = opts;
        return { challenge: "challenge-1" };
      },
    } as any;
    const options: any = await service.generateTwoFactorPasskeyOptions("login-passkey-1", {} as any);
    assert.equal(options.challenge, "challenge-1");
    assert.deepEqual(captured, { userId: 11, purpose: "login2fa", userVerification: "required" });
    cache.delete("login_2fa_code:login-passkey-1");
  });

  it("验证通过后消费2FA会话并签发当前用户令牌", async () => {
    const service = await createPlusService();
    cache.set("login_2fa_code:login-passkey-2", 12, { ttl: 60000 });
    let verifyOpts: any;
    service.passkeyService = {
      async verifyAuthenticationResponse(_credential: any, _challenge: string, _ctx: any, opts: any) {
        verifyOpts = opts;
      },
    } as any;
    service.userService = { async info(id: number) { return { id, username: "u12", status: 1 }; } } as any;
    service.generateToken = async (user: any) => ({ token: "t", expire: 1, userId: user.id, username: user.username }) as any;
    const token: any = await service.loginByTwoFactorPasskey({ loginId: "login-passkey-2", credential: { id: "c" }, challenge: "ch" }, {} as any);
    assert.equal(token.userId, 12);
    assert.deepEqual(verifyOpts, { expectedUserId: 12, purpose: "login2fa", requireUserVerification: true });
    assert.equal(cache.get("login_2fa_code:login-passkey-2"), undefined);
  });

  it("登录会话过期时拒绝", async () => {
    const service = await createPlusService();
    await assert.rejects(() => service.generateTwoFactorPasskeyOptions("missing-login", {} as any), /超时/);
  });
});
