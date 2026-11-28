import assert from "node:assert/strict";
import esmock from "esmock";

async function createService(opts: { enabled?: boolean; validCode?: string } = {}) {
  const { TwoFactorService } = await esmock("./two-factor-service.js", {
    "@certd/pipeline": {
      async importRuntime() {
        return {
          authenticator: {
            verify({ token }: any) {
              return token === (opts.validCode ?? "123456");
            },
            generateSecret() {
              return "secret";
            },
          },
        };
      },
    },
  });
  const service = new TwoFactorService();
  service.userSettingsService = {
    async getSetting() {
      return {
        authenticator: { enabled: opts.enabled !== false, verified: opts.enabled !== false, secret: "secret" },
      };
    },
    async saveSetting() {},
  } as any;
  service.userService = { async info() { return { username: "u" }; } } as any;
  return service;
}

describe("TwoFactorService OTP安全校验", () => {
  it("验证码成功一次后不能重复使用", async function (this: any) {
    this.timeout(20000);
    const service = await createService({ validCode: "654321" });
    await service.verifyAuthenticatorCode(201, "654321");
    await assert.rejects(() => service.verifyAuthenticatorCode(201, "654321"), /已使用/);
  });

  it("同一验证码并发提交最多一个成功", async () => {
    const service = await createService({ validCode: "135790" });
    const results = await Promise.allSettled([service.verifyAuthenticatorCode(205, "135790"), service.verifyAuthenticatorCode(205, "135790")]);
    assert.equal(results.filter(item => item.status === "fulfilled").length, 1);
    assert.equal(results.filter(item => item.status === "rejected" && /已使用/.test(String(item.reason?.message))).length, 1);
  });

  it("多个错误验证码并发提交会累计并触发锁定", async () => {
    const service = await createService({ validCode: "222222" });
    await Promise.allSettled(Array.from({ length: 5 }, () => service.verifyAuthenticatorCode(206, "000000")));
    await assert.rejects(() => service.verifyAuthenticatorCode(206, "222222"), /次数过多/);
  });

  it("连续失败达到上限后锁定，即使输入正确也拒绝", async () => {
    const service = await createService({ validCode: "888888" });
    for (let i = 0; i < 4; i++) {
      await assert.rejects(() => service.verifyAuthenticatorCode(202, "000000"), /验证码错误/);
    }
    await assert.rejects(() => service.verifyAuthenticatorCode(202, "000000"), /次数过多/);
    await assert.rejects(() => service.verifyAuthenticatorCode(202, "888888"), /次数过多/);
  });

  it("未开启TOTP时拒绝作为Passkey管理二次认证", async () => {
    const service = await createService({ enabled: false });
    await assert.rejects(() => service.assertAuthenticatorEnabled(203), /请先开启并验证TOTP 2FA/);
  });

  it("保存TOTP时同样受失败锁定与重放保护", async () => {
    const service = await createService({ validCode: "246810" });
    await service.saveAuthenticator({ userId: 204, verifyCode: "246810" });
    await assert.rejects(() => service.saveAuthenticator({ userId: 204, verifyCode: "246810" }), /已使用/);
  });
});
