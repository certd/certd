import assert from "node:assert/strict";
import { MinePasskeyController } from "./passkey-controller.js";

function createController(overrides: any = {}) {
  const calls: any = { assert: 0, verify: [], delete: [], reactivate: [], generate: 0 };
  const controller: any = new MinePasskeyController();
  controller.getUserId = () => 1;
  controller.ok = (value: any) => value;
  controller.auditLog = () => {};
  controller.userService = { async info() { return { id: 1, username: "u" }; } };
  controller.twoFactorService = {
    async assertAuthenticatorEnabled() {
      calls.assert++;
    },
    async verifyAuthenticatorCode(_userId: number, code: string) {
      calls.verify.push(code);
    },
  };
  controller.passkeyService = {
    async generateRegistrationOptions() {
      calls.generate++;
      return { challenge: "c" };
    },
    async registerPasskey() {
      return { success: true };
    },
    async findOne() {
      return { id: 5, deviceName: "phone" };
    },
    async delete(ids: any[]) {
      calls.delete.push(ids);
    },
    async reactivatePasskey() {
      calls.reactivate.push(true);
      return { success: true };
    },
    async autoDisableExpiredPasskeys() {},
    async find() {
      return [];
    },
    ...overrides,
  };
  return { controller, calls };
}

describe("MinePasskeyController 2FA保护", () => {
  it("注册Passkey前必须完成TOTP且TOTP已开启", async () => {
    const { controller, calls } = createController();
    await controller.generateRegistration({ verifyCode: "123456" }, "127.0.0.1");
    assert.equal(calls.assert, 1);
    assert.deepEqual(calls.verify, ["123456"]);
    assert.equal(calls.generate, 1);
  });

  it("移除Passkey必须先通过TOTP校验", async () => {
    const { controller, calls } = createController();
    await controller.unbindPasskey({ id: 5, verifyCode: "654321" });
    assert.deepEqual(calls.verify, ["654321"]);
    assert.deepEqual(calls.delete, [[5]]);
  });

  it("重新激活Passkey必须通过TOTP校验", async () => {
    const { controller, calls } = createController();
    await controller.reactivatePasskey({ id: 5, verifyCode: "111111" });
    assert.deepEqual(calls.verify, ["111111"]);
    assert.equal(calls.reactivate.length, 1);
  });
});


describe("MinePasskeyController 注册入口一致性", () => {
  it("注册token由TOTP生成并一次性消费，两个入口共享相同校验", async () => {
    const { controller } = createController();
    const options: any = await controller.generateRegistration({ verifyCode: "123456" }, "127.0.0.1");
    assert.ok(options.verifyToken);
    await controller.verifyRegistration({ verifyToken: options.verifyToken, response: {}, challenge: "ch", deviceName: "phone" });
    await assert.rejects(
      () => controller.registerPasskey({ verifyToken: options.verifyToken, response: {}, challenge: "ch", deviceName: "phone" }),
      /已过期/
    );
  });

  it("删除其他用户或不存在Passkey时拒绝且不删除", async () => {
    const { controller, calls } = createController({
      async findOne() {
        return null;
      },
    });
    await assert.rejects(() => controller.unbindPasskey({ id: 99, verifyCode: "123456" }), /Passkey不存在/);
    assert.equal(calls.delete.length, 0);
  });
});
