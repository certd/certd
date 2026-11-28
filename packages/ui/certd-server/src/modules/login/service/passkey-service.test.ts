import assert from "node:assert/strict";
import { cache } from "@certd/basic";
import { PasskeyService } from "./passkey-service.js";

function createService() {
  const service = new PasskeyService();
  service.getRpInfo = async () => {
    return { rpName: "Certd", rpId: "example.com", origin: "https://example.com" };
  };
  (service as any).find = async () => {
    return [{ passkeyId: "cred-1", transports: null }];
  };
  service.repository = {
    async findOne(opts: any) {
      if (opts.where.passkeyId !== "cred-1") {
        return null;
      }
      return {
        passkeyId: "cred-1",
        userId: 1,
        publicKey: Buffer.from("public-key").toString("base64"),
        counter: 0,
        transports: null,
        rpId: "example.com",
      };
    },
    async save(entity: any) {
      return entity;
    },
  } as any;
  return service;
}

describe("PasskeyService 查看密钥 step-up", () => {
  it("challenge 绑定用户和用途，用途/用户不匹配或重复使用都会拒绝", async () => {
    const service = createService();
    const options: any = await service.generateAuthenticationOptions({} as any, {
      userId: 1,
      purpose: "secretAccess",
      userVerification: "required",
    });

    assert.equal(options.userVerification, "required");
    assert.equal(options.allowCredentials.length, 1);
    assert.equal(options.allowCredentials[0].id, "cred-1");

    await assert.rejects(
      () =>
        service.verifyAuthenticationResponse({ id: "cred-1" }, options.challenge, {} as any, {
          expectedUserId: 1,
          purpose: "login",
        }),
      /场景不匹配/
    );

    await assert.rejects(
      () =>
        service.verifyAuthenticationResponse({ id: "cred-1" }, options.challenge, {} as any, {
          expectedUserId: 2,
          purpose: "secretAccess",
        }),
      /用户不匹配/
    );

    // 凭证不存在时，challenge 已在进入第三方验签前被一次性消费
    await assert.rejects(
      () =>
        service.verifyAuthenticationResponse({ id: "missing-cred" }, options.challenge, {} as any, {
          expectedUserId: 1,
          purpose: "secretAccess",
        }),
      /Passkey不存在/
    );

    await assert.rejects(
      () =>
        service.verifyAuthenticationResponse({ id: "cred-1" }, options.challenge, {} as any, {
          expectedUserId: 1,
          purpose: "secretAccess",
        }),
      /已过期/
    );
  });

  it("未生成 challenge 时拒绝", async () => {
    const service = createService();
    await assert.rejects(
      () =>
        service.verifyAuthenticationResponse({ id: "cred-1" }, "challenge-not-exist", {} as any, {
          expectedUserId: 1,
          purpose: "secretAccess",
        }),
      /已过期/
    );
  });
});


describe("PasskeyService challenge 一次性消费与绑定", () => {
  it("同一challenge并发验证最多一个请求能取得challenge", async () => {
    const service = createService();
    const options: any = await service.generateAuthenticationOptions({} as any, {
      userId: 1,
      purpose: "secretAccess",
      userVerification: "required",
    });
    const results = await Promise.allSettled([
      service.verifyAuthenticationResponse({ id: "cred-1" }, options.challenge, {} as any, { expectedUserId: 1, purpose: "secretAccess" }),
      service.verifyAuthenticationResponse({ id: "cred-1" }, options.challenge, {} as any, { expectedUserId: 1, purpose: "secretAccess" }),
    ]);
    const expired = results.filter(item => item.status === "rejected" && /已过期/.test(String(item.reason?.message))).length;
    assert.equal(expired, 1, "同一challenge并发时只能有一个请求消费成功");
  });

  it("同一注册challenge并发消费最多一个请求能继续", async () => {
    const service = createService();
    cache.set("passkey:registration:concurrent-reg", 1, { ttl: 60000 });
    const results = await Promise.allSettled([
      service.verifyRegistrationResponse(1, {}, "concurrent-reg", {} as any),
      service.verifyRegistrationResponse(1, {}, "concurrent-reg", {} as any),
    ]);
    const expired = results.filter(item => item.status === "rejected" && /注册验证已过期/.test(String(item.reason?.message))).length;
    assert.equal(expired, 1, "注册challenge只能被一个请求消费");
  });

  it("凭证不属于当前用户时拒绝", async () => {
    const service = createService();
    const options: any = await service.generateAuthenticationOptions({} as any, {
      userId: 2,
      purpose: "secretAccess",
      userVerification: "required",
    });
    await assert.rejects(
      () => service.verifyAuthenticationResponse({ id: "cred-1" }, options.challenge, {} as any, { expectedUserId: 2, purpose: "secretAccess" }),
      /不属于当前用户/
    );
  });

});


describe("PasskeyService 30天未使用停用与激活", () => {
  const DAY = 24 * 60 * 60 * 1000;

  it("列出/生成认证选项前自动停用30天未使用的Passkey", async () => {
    const service = createService();
    const updates: any[] = [];
    (service as any).find = async () => [
      { id: 1, userId: 1, disabled: false, lastUsedAt: Date.now() - 31 * DAY },
      { id: 2, userId: 1, disabled: false, lastUsedAt: Date.now() - 5 * DAY },
    ];
    (service as any).repository.update = async (where: any, set: any) => {
      updates.push({ where, set });
      return { affected: 1 };
    };
    await service.autoDisableExpiredPasskeys(1);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].set.disabled, true);
    assert.equal(updates[0].where.disabled, false, "停用必须带disabled=false条件");
    assert.ok(updates[0].where.lastActiveAt, "停用必须复核最近活跃时间");
  });

  it("停用的Passkey不能用于认证", async () => {
    const service = createService();
    (service.repository as any).findOne = async () => ({
      id: 1,
      passkeyId: "cred-1",
      userId: 1,
      disabled: true,
      publicKey: Buffer.from("key").toString("base64"),
      counter: 0,
      transports: null,
      rpId: "example.com",
    });
    cache.set("passkey:authentication:disabled-passkey", { userId: 1, purpose: "secretAccess" }, { ttl: 60000 });
    await assert.rejects(
      () =>
        service.verifyAuthenticationResponse({ id: "cred-1" }, "disabled-passkey", {} as any, {
          expectedUserId: 1,
          purpose: "secretAccess",
          requireUserVerification: true,
        }),
      /已停用/
    );
  });

  it("超过30天未使用在认证时自动停用", async () => {
    const service = createService();
    let disabled = false;
    (service.repository as any).findOne = async () => ({
      id: 1,
      passkeyId: "cred-1",
      userId: 1,
      disabled: false,
      lastUsedAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
      publicKey: Buffer.from("key").toString("base64"),
      counter: 0,
      transports: null,
      rpId: "example.com",
    });
    (service.repository as any).update = async () => {
      disabled = true;
      return { affected: 1 } as any;
    };
    cache.set("passkey:authentication:expired-passkey", { userId: 1, purpose: "secretAccess" }, { ttl: 60000 });
    await assert.rejects(
      () =>
        service.verifyAuthenticationResponse({ id: "cred-1" }, "expired-passkey", {} as any, {
          expectedUserId: 1,
          purpose: "secretAccess",
          requireUserVerification: true,
        }),
      /30天/
    );
    assert.equal(disabled, true);
  });

  it("TOTP验证后可重新激活Passkey，且不伪装成最近认证时间", async () => {
    const service = createService();
    let where: any;
    let updated: any;
    (service.repository as any).update = async (w: any, set: any) => {
      where = w;
      updated = set;
      return { affected: 1 } as any;
    };
    await service.reactivatePasskey(9, 5);
    assert.deepEqual({ id: where.id, userId: where.userId, disabled: where.disabled }, { id: 5, userId: 9, disabled: true });
    assert.equal(updated.disabled, false);
    assert.equal(updated.lastUsedAt, undefined);
    assert.ok(updated.lastActiveAt > 0);
  });

  it("重新激活目标不存在或非停用状态时拒绝", async () => {
    const service = createService();
    (service.repository as any).update = async () => ({ affected: 0 });
    await assert.rejects(() => service.reactivatePasskey(9, 5), /不存在或当前状态不可激活/);
  });

  it("认证成功使用字段级条件更新，不覆盖disabled", async () => {
    const service = createService();
    let captured: any;
    (service.repository as any).update = async (where: any, set: any) => {
      captured = { where, set };
      return { affected: 1 };
    };
    await (service as any).markAuthenticationSuccess({ id: 7, rpId: "example.com" }, 3, "example.com");
    assert.deepEqual(captured.where, { id: 7, disabled: false });
    assert.equal("disabled" in captured.set, false);
    assert.ok(captured.set.lastUsedAt > 0);
    assert.ok(captured.set.lastActiveAt > 0);
  });

  it("认证成功与并发停用冲突时fail-closed", async () => {
    const service = createService();
    (service.repository as any).update = async () => ({ affected: 0 });
    await assert.rejects(() => (service as any).markAuthenticationSuccess({ id: 7, rpId: "example.com" }, 3, "example.com"), /已停用/);
  });

  it("自动停用与认证成功并发时最终状态一致", async () => {
    const service = createService();
    const oldAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const row: any = { id: 1, userId: 1, disabled: false, lastActiveAt: oldAt, lastUsedAt: oldAt };
    (service as any).find = async () => [{ ...row }];
    (service.repository as any).update = async (where: any, set: any) => {
      await Promise.resolve();
      if (where.id !== row.id || where.disabled !== row.disabled) {
        return { affected: 0 };
      }
      if (where.lastActiveAt !== undefined && where.lastActiveAt !== row.lastActiveAt) {
        return { affected: 0 };
      }
      Object.assign(row, set);
      return { affected: 1 };
    };
    const results = await Promise.allSettled([service.autoDisableExpiredPasskeys(1), (service as any).markAuthenticationSuccess({ id: 1, rpId: "example.com" }, 2, "example.com")]);
    if (row.disabled) {
      assert.equal(results[1].status, "rejected", "停用胜出时认证必须fail-closed");
    } else {
      assert.ok(row.lastActiveAt > oldAt, "认证胜出时生命周期时间必须推进");
      assert.equal(results[0].status, "fulfilled");
    }
  });

  it("自动停用与重新激活并发时不会产生错误状态", async () => {
    const service = createService();
    const oldAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const row: any = { id: 1, userId: 1, disabled: true, lastActiveAt: oldAt };
    (service as any).find = async ({ where }: any) => {
      if (where.disabled === false && row.disabled === false) {
        return [{ ...row }];
      }
      return [];
    };
    (service.repository as any).update = async (where: any, set: any) => {
      if (where.id !== row.id || (where.disabled !== undefined && where.disabled !== row.disabled)) {
        return { affected: 0 };
      }
      Object.assign(row, set);
      return { affected: 1 };
    };
    await Promise.all([service.autoDisableExpiredPasskeys(1), service.reactivatePasskey(1, 1)]);
    assert.equal(row.disabled, false, "重新激活后的Passkey不应被自动停用为错误状态");
    assert.ok(row.lastActiveAt > oldAt);
  });

  it("重新激活后不再因停用状态被拒绝（后续WebAuthn校验继续）", async () => {
    const service = createService();
    let disabled = true;
    (service.repository as any).update = async (_where: any, set: any) => {
      if (set.disabled === false) {
        disabled = false;
      }
      return { affected: 1 };
    };
    await service.reactivatePasskey(1, 5);
    assert.equal(disabled, false);
    (service.repository as any).findOne = async () => ({
      id: 5,
      passkeyId: "cred-1",
      userId: 1,
      disabled: false,
      lastActiveAt: Date.now(),
      publicKey: Buffer.from("invalid-key").toString("base64"),
      counter: 0,
      transports: null,
      rpId: "example.com",
    });
    cache.set("passkey:authentication:reactivated", { userId: 1, purpose: "secretAccess" }, { ttl: 60000 });
    await assert.rejects(
      () =>
        service.verifyAuthenticationResponse({ id: "cred-1" }, "reactivated", {} as any, {
          expectedUserId: 1,
          purpose: "secretAccess",
          requireUserVerification: true,
        }),
      (e: any) => !/已停用|30天/.test(String(e?.message))
    );
  });

  it("并发唯一索引冲突时提示已注册且不产生不完整记录", async () => {
    const service = createService();
    (service as any).verifyRegistrationResponse = async () => ({ credentialId: "cred-race", credentialPublicKey: new Uint8Array(), counter: 0 });
    (service as any).getRpInfo = async () => ({ rpId: "example.com" });
    (service.repository as any).findOne = async () => null;
    (service as any).add = async () => {
      throw new Error("UNIQUE constraint failed: sys_passkey.passkey_id");
    };
    await assert.rejects(() => service.registerPasskey(1, {}, "ch", "phone", {} as any), /已注册/);
  });

  it("重复注册同一credential时拒绝", async () => {
    const service = createService();
    (service as any).verifyRegistrationResponse = async () => ({ credentialId: "cred-1", credentialPublicKey: new Uint8Array(), counter: 0 });
    (service as any).getRpInfo = async () => ({ rpId: "example.com" });
    (service.repository as any).findOne = async () => ({ id: 1, passkeyId: "cred-1" });
    await assert.rejects(() => service.registerPasskey(1, {}, "ch", "phone", {} as any), /已注册/);
  });
});
