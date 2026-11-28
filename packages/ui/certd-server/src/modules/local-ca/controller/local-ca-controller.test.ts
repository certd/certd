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
