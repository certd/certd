import assert from "node:assert/strict";
import { LocalCaController } from "./local-ca-controller.js";

describe("LocalCaController ACME访问控制参数透传", () => {
  function createController() {
    const controller: any = new LocalCaController();
    const state = { captured: null as any };
    controller.service = {
      async setAcmeAccess(req: any) {
        state.captured = req;
        return { saved: true };
      },
    };
    controller.assertStepUp = () => {};
    controller.checkCaAccess = async () => ({ userId: 7, projectId: 3 });
    controller.auditLog = () => {};
    controller.ok = (value: any) => value;
    return { controller, state };
  }

  it("保存时完整传递客户端IP来源、IP请求头和可信代理CIDR", async () => {
    const { controller, state } = createController();
    const body = {
      id: 9,
      verifyToken: "token",
      ipAllowlist: ["10.0.0.0/8"],
      basicAuth: { enabled: true, username: "demo" },
      requiredHeaders: [{ name: "X-Gateway", value: "ok" }],
      clientIpSource: "header",
      clientIpHeader: "cf-connecting-ip",
      trustProxyCidrs: ["192.168.0.0/16"],
    };
    const res = await controller.setAcmeAccess(body);
    assert.deepEqual(state.captured, {
      id: 9,
      caId: 9,
      userId: 7,
      projectId: 3,
      ipAllowlist: ["10.0.0.0/8"],
      basicAuth: { enabled: true, username: "demo" },
      requiredHeaders: [{ name: "X-Gateway", value: "ok" }],
      clientIpSource: "header",
      clientIpHeader: "cf-connecting-ip",
      trustProxyCidrs: ["192.168.0.0/16"],
    });
    assert.deepEqual(res, { saved: true });
  });
});

describe("LocalCaController EAB用途与分配补偿", () => {
  function createController(service: any = {}) {
    const controller: any = new LocalCaController();
    controller.service = service;
    controller.assertStepUp = () => {};
    controller.checkCaAccess = async () => ({ userId: 7, projectId: 3 });
    controller.auditLog = () => {};
    controller.ok = (value: any) => value;
    return controller;
  }

  it("创建EAB时透传mode（含非法值回落undefined）", async () => {
    const calls: any[] = [];
    const controller = createController({
      async createAcmeEab(req: any) {
        calls.push(req);
        return { name: "n", kid: "k", id: "e1" };
      },
    });
    await controller.createEab({ caId: 9, verifyToken: "t", name: "n", mode: "local" });
    await controller.createEab({ caId: 9, verifyToken: "t", name: "n", mode: "standard" });
    await controller.createEab({ caId: 9, verifyToken: "t", name: "n", mode: "bad" });
    assert.equal(calls[0].mode, "local");
    assert.equal(calls[1].mode, "standard");
    assert.equal(calls[2].mode, undefined);
  });

  it("分配授权：disabled Grant不算有效授权，需恢复启用；ensureGrant=false必须已有有效授权", async () => {
    const added: any[] = [];
    const controller = createController({
      async listGrants() {
        return [{ id: 11, userId: 5, projectId: 0, disabled: true }];
      },
      async addGrant(req: any) {
        added.push(req);
        return { id: 11 };
      },
    });
    const ensured = await controller.ensureAssignGrant(9, 7, "user", 5, undefined);
    assert.deepEqual(ensured, { changed: true, grantId: 11, created: false, revived: true });
    assert.equal(added.length, 1);
    await assert.rejects(() => controller.assertActiveAssignGrant(9, 7, "user", 5, undefined), /有效授权/);

    const activeController = createController({
      async listGrants() {
        return [{ id: 12, userId: 5, projectId: 0, disabled: false }];
      },
      async addGrant() {
        throw new Error("不应重复添加");
      },
    });
    const active = await activeController.ensureAssignGrant(9, 7, "user", 5, undefined);
    assert.deepEqual(active, { changed: false, grantId: 12, created: false, revived: false });
    await activeController.assertActiveAssignGrant(9, 7, "user", 5, undefined);
  });

  it("分配失败补偿：新增授权撤销，恢复的授权重新禁用", async () => {
    const removed: any[] = [];
    const disabled: any[] = [];
    const controller = createController({
      async removeGrant(req: any) {
        removed.push(req);
      },
      async setGrantDisabledForCompensation(req: any) {
        disabled.push(req);
      },
    });
    await controller.rollbackAssignGrant(9, 7, { changed: true, grantId: 21, created: true, revived: false });
    await controller.rollbackAssignGrant(9, 7, { changed: true, grantId: 22, created: false, revived: true });
    await controller.rollbackAssignGrant(9, 7, { changed: false, grantId: 23, created: false, revived: false });
    assert.deepEqual(removed, [{ id: 9, userId: 7, grantId: 21, disableAccounts: false }]);
    assert.deepEqual(disabled, [{ caId: 9, grantId: 22, disabled: true }]);
  });
});
