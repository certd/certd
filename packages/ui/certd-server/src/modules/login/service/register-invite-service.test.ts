import assert from "node:assert/strict";
import { RegisterInviteService, resolveRegisterMode } from "./register-invite-service.js";

declare const describe: any;
declare const it: any;
declare const beforeEach: any;

function createService() {
  const service = new RegisterInviteService();
  return service;
}

describe("RegisterInviteService", () => {
  beforeEach(() => RegisterInviteService.resetRateLimitForTest());

  it("生成邀请只保存哈希，明文token仅返回一次", async () => {
    const service = createService();
    const saved: any[] = [];
    (service as any).repository = {
      create: (e: any) => e,
      save: async (e: any) => {
        saved.push(e);
        return { ...e, id: 1 };
      },
    };
    const res = await service.create({ createdBy: 7, expiresDays: 5 });
    assert.ok(res.token.length >= 32);
    assert.equal(saved[0].tokenHash, service.hashToken(res.token));
    assert.equal(saved[0].tokenHash.includes(res.token), false, "数据库不应保存明文token");
    assert.equal(saved[0].createdBy, 7);
    assert.ok(saved[0].expiresTime > Date.now());
  });

  it("有效期默认3天并裁剪到1-30天", async () => {
    const service = createService();
    const days: number[] = [];
    (service as any).repository = {
      create: (e: any) => e,
      save: async (e: any) => {
        days.push((e.expiresTime - Date.now()) / 86400000);
        return { ...e, id: 1 };
      },
    };
    assert.equal((await service.create({ createdBy: 1 })).expiresDays, 3);
    assert.equal((await service.create({ createdBy: 1, expiresDays: 0 })).expiresDays, 3);
    assert.equal((await service.create({ createdBy: 1, expiresDays: 100 })).expiresDays, 30);
    assert.ok(days.every(d => d > 0 && d <= 30.1));
  });

  it("findUsableByToken 按哈希查询，空token直接返回null", async () => {
    const service = createService();
    let captured: any;
    (service as any).repository = {
      findOne: async (args: any) => {
        captured = args.where;
        return { id: 1 };
      },
    };
    assert.equal(await service.findUsableByToken(""), null);
    const bean = await service.findUsableByToken("token-abc");
    assert.ok(bean);
    assert.equal(captured.tokenHash, service.hashToken("token-abc"));
    assert.equal(captured.disabled, false, "禁用的链接必须不可用");
  });

  it("consume 使用条件UPDATE原子领取（未使用且未过期）", async () => {
    const service = createService();
    const conditions: string[] = [];
    let setValues: any;
    (service as any).repository = {
      createQueryBuilder() {
        return {
          update() {
            return this;
          },
          set(values: any) {
            setValues = values;
            return this;
          },
          where(sql: string) {
            conditions.push(sql);
            return this;
          },
          andWhere(sql: string) {
            conditions.push(sql);
            return this;
          },
          async execute() {
            return { affected: 1 };
          },
        };
      },
    };
    const ok = await service.consume({ token: "abc", usedUserId: 9, usedUserName: "alice" });
    assert.equal(ok, true);
    assert.ok(conditions.some(c => /token_hash = :tokenHash/.test(c)));
    assert.ok(conditions.some(c => /used_time IS NULL/.test(c)));
    assert.ok(conditions.some(c => /disabled = :disabled/.test(c)));
    assert.ok(conditions.some(c => /expires_time > :now/.test(c)));
    assert.equal(setValues.usedUserId, 9);
    assert.equal(setValues.usedUserName, "alice");
    assert.ok(setValues.usedTime > 0);
  });

  it("consume 在已被领取时返回false", async () => {
    const service = createService();
    (service as any).repository = {
      createQueryBuilder() {
        return {
          update() {
            return this;
          },
          set() {
            return this;
          },
          where() {
            return this;
          },
          andWhere() {
            return this;
          },
          async execute() {
            return { affected: 0 };
          },
        };
      },
    };
    assert.equal(await service.consume({ token: "abc", usedUserId: 1, usedUserName: "x" }), false);
  });

  it("列表隐藏已过期且未使用的链接，保留已使用与有效链接", async () => {
    const service = createService();
    const now = Date.now();
    (service as any).repository = {
      find: async () => [
        { id: 1, expiresTime: now - 1000, usedTime: null },
        { id: 2, expiresTime: now - 1000, usedTime: now - 500, usedUserName: "bob" },
        { id: 3, expiresTime: now + 100000, usedTime: null, disabled: false },
        { id: 4, expiresTime: now + 100000, usedTime: null, disabled: true },
      ],
    };
    const list = await service.listInvites();
    assert.deepEqual(
      list.map(item => item.id),
      [2, 3]
    );
    assert.equal(list[0].status, "used");
    assert.equal(list[0].usedUserName, "bob");
    assert.equal(list[1].status, "active");
  });

  it("disable 使用条件UPDATE原子禁用未使用链接", async () => {
    const service = createService();
    const conditions: string[] = [];
    let setValues: any;
    (service as any).repository = {
      createQueryBuilder() {
        return {
          update() {
            return this;
          },
          set(values: any) {
            setValues = values;
            return this;
          },
          where(sql: string) {
            conditions.push(sql);
            return this;
          },
          andWhere(sql: string) {
            conditions.push(sql);
            return this;
          },
          async execute() {
            return { affected: 1 };
          },
        };
      },
    };
    assert.equal(await service.disable(5), true);
    assert.ok(conditions.some(c => /used_time IS NULL/.test(c)));
    assert.ok(conditions.some(c => /disabled = :disabled/.test(c)));
    assert.equal(setValues.disabled, true);
    assert.ok(setValues.disabledTime > 0);
  });

  it("按IP限流：注册7次/分钟，状态30次/分钟，错误token也计数", () => {
    const service = createService();
    for (let i = 0; i < 7; i++) {
      assert.doesNotThrow(() => service.assertRateLimit("1.2.3.4", "register"));
    }
    assert.throws(() => service.assertRateLimit("1.2.3.4", "register"), /未开放注册/);
    // 不同维度独立计数
    assert.doesNotThrow(() => service.assertRateLimit("1.2.3.4", "status"));
    // 其他IP不受影响
    assert.doesNotThrow(() => service.assertRateLimit("5.6.7.8", "register"));
  });
});

describe("resolveRegisterMode", () => {
  it("显式模式优先，否则按 registerEnabled 派生", () => {
    assert.equal(resolveRegisterMode({ registerMode: "invite", registerEnabled: true }), "invite");
    assert.equal(resolveRegisterMode({ registerEnabled: true }), "open");
    assert.equal(resolveRegisterMode({ registerEnabled: false }), "closed");
    assert.equal(resolveRegisterMode({}), "open");
  });
});
