import assert from "node:assert/strict";
import { UserTwoFactorSettingController } from "./setting-two-factor-controller.js";

describe("关闭 2FA 设置", () => {
  it("关闭验证器时必须先验证当前用户的密码", async () => {
    const controller = new UserTwoFactorSettingController();
    controller.getUserId = () => 7;
    const calls: unknown[] = [];
    Object.assign(controller, {
      twoFactorService: {
        async verifyPassword(userId: number, password: string) {
          calls.push([userId, password]);
          if (password !== "correct") {
            throw new Error("登录密码错误");
          }
        },
        async offAuthenticator(userId: number) {
          calls.push(userId);
        },
      },
      auditLog() {},
      ok() {},
    });

    await assert.rejects(() => controller.authenticatorOff("wrong"), /登录密码错误/);
    await controller.authenticatorOff("correct");
    assert.deepEqual(calls, [[7, "wrong"], [7, "correct"], 7]);
  });
});
