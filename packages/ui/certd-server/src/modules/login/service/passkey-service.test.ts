import assert from "node:assert/strict";
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
