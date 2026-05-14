/// <reference types="mocha" />

import assert from "node:assert/strict";
import { UserService } from "./user-service.js";

describe("UserService.initPassword", () => {
  function createService(user: any) {
    const service = new UserService();
    service.info = async () => user;
    let updatedParam: any;
    service.update = async (param: any) => {
      updatedParam = param;
    };
    return { service, getUpdatedParam: () => updatedParam };
  }

  it("sets a new password when current password is changeme", async () => {
    const { service, getUpdatedParam } = createService({
      id: 12,
      password: "changeme",
      passwordVersion: 2,
    });

    await service.initPassword(12, {
      newPassword: "new-password",
      confirmNewPassword: "new-password",
    });

    assert.deepEqual(getUpdatedParam(), {
      id: 12,
      password: "new-password",
    });
  });

  it("rejects initPassword after password has already been set", async () => {
    const { service } = createService({
      id: 12,
      password: "$2a$10$already-hashed",
      passwordVersion: 2,
    });

    await assert.rejects(
      () =>
        service.initPassword(12, {
          newPassword: "new-password",
          confirmNewPassword: "new-password",
        }),
      /当前账号已设置密码/
    );
  });
});
