import assert from "node:assert/strict";
import { AcmeServerService, sanitizePublicJwk } from "./acme-server-service.js";
import { base64urlEncode, jwkThumbprint } from "../protocol/acme-jws.js";

function createJwsBody(header: any, payload: any = null) {
  return {
    protected: base64urlEncode(JSON.stringify({ alg: "RS256", ...header })),
    payload: payload == null ? "" : base64urlEncode(JSON.stringify(payload)),
    signature: base64urlEncode("signature"),
  };
}

describe("AcmeServerService account JWK", () => {
  it("拒绝包含私钥参数的 JWK，并只返回公钥字段", () => {
    assert.throws(
      () => sanitizePublicJwk({ kty: "RSA", n: "n", e: "AQAB", d: "secret" }),
      (e: any) => String(e?.message || "").includes("不能包含私钥参数")
    );
    assert.throws(
      () => sanitizePublicJwk({ kty: "EC", crv: "P-256", x: "x", y: "y", d: "secret" }),
      (e: any) => String(e?.message || "").includes("不能包含私钥参数")
    );
    assert.deepEqual(sanitizePublicJwk({ kty: "RSA", n: "n", e: "AQAB", use: "sig" }), { kty: "RSA", n: "n", e: "AQAB" });
  });
});

it("Directory 暴露远程可识别的直签元数据", async () => {
  const service: any = new AcmeServerService();
  service.issuer = {
    async getAcmeCa() {
      return { id: 2 };
    },
    async getCaBaseUrl() {
      return "https://certd.example.com";
    },
  };
  const dir = await service.directory(2);
  assert.deepEqual(dir.meta.certdLocalCa, { caId: 2, eabRequired: true });
});

describe("AcmeServerService CA isolation", () => {
  it("每个中间CA拥有独立的Directory和端点URL", async () => {
    const service: any = new AcmeServerService();
    service.issuer = {
      async getAcmeCa(id: number) {
        return { id };
      },
      async getCaBaseUrl() {
        return "https://certd.example.com";
      },
    };
    const caA = await service.directory(101);
    const caB = await service.directory(102);
    assert.equal(caA.newOrder, "https://certd.example.com/api/acme/101/new-order");
    assert.equal(caB.newOrder, "https://certd.example.com/api/acme/102/new-order");
    assert.notEqual(caA.newNonce, caB.newNonce);
  });

  it("CA B 的接口拒绝 CA A 的账号kid", async () => {
    const service: any = new AcmeServerService();
    service.issuer = { async getAcmeCa() {}, async getCaBaseUrl() { return "https://certd.example.com"; } };
    let lookupCalled = false;
    service.accountRepository = {
      async findOne() {
        lookupCalled = true;
        return null;
      },
    };
    const ctx = { origin: "https://certd.example.com", path: "/api/acme/102/order/o1", protocol: "https", host: "certd.example.com" };
    const body = createJwsBody({ kid: "https://certd.example.com/api/acme/101/account/account-a", url: "https://certd.example.com/api/acme/102/order/o1", nonce: "nonce-b" });
    await assert.rejects(() => service.getOrder(ctx, 102, "o1", body), /账户kid与当前CA不匹配/);
    assert.equal(lookupCalled, false);
  });

  it("kid路径必须符合 /api/acme/{caId}/account/{id} 格式", async () => {
    const service: any = new AcmeServerService();
    service.issuer = { async getAcmeCa() {}, async getCaBaseUrl() { return "https://certd.example.com"; } };
    let lookupCalled = false;
    service.accountRepository = {
      async findOne() {
        lookupCalled = true;
        return null;
      },
    };
    const ctx = { origin: "https://certd.example.com", path: "/api/acme/102/order/o1", protocol: "https", host: "certd.example.com" };
    const body = createJwsBody({ kid: "https://certd.example.com/api/acme/102/other/account/account-b", url: "https://certd.example.com/api/acme/102/order/o1", nonce: "nonce-b" });
    await assert.rejects(() => service.getOrder(ctx, 102, "o1", body), /kid格式错误/);
    assert.equal(lookupCalled, false);
  });

  it("kid中的CA ID必须是正十进制数字", async () => {
    const service: any = new AcmeServerService();
    service.issuer = { async getAcmeCa() {}, async getCaBaseUrl() { return "https://certd.example.com"; } };
    let lookupCalled = false;
    service.accountRepository = {
      async findOne() {
        lookupCalled = true;
        return null;
      },
    };
    const ctx = { origin: "https://certd.example.com", path: "/api/acme/102/order/o1", protocol: "https", host: "certd.example.com" };
    const body = createJwsBody({ kid: "https://certd.example.com/api/acme/0x66/account/account-b", url: "https://certd.example.com/api/acme/102/order/o1", nonce: "nonce-b" });
    await assert.rejects(() => service.getOrder(ctx, 102, "o1", body), /kid格式错误/);
    assert.equal(lookupCalled, false);
  });

  it("账号kid中的CA路径匹配时，查询仍带URL中的CA id", async () => {
    const service: any = new AcmeServerService();
    service.issuer = { async getAcmeCa() {}, async getCaBaseUrl() { return "https://certd.example.com"; } };
    let lookupWhere: any = null;
    service.accountRepository = {
      async findOne(args: any) {
        lookupWhere = args.where;
        return null;
      },
    };
    const ctx = { origin: "https://certd.example.com", path: "/api/acme/102/order/o1", protocol: "https", host: "certd.example.com" };
    const body = createJwsBody({ kid: "https://certd.example.com/api/acme/102/account/account-b", url: "https://certd.example.com/api/acme/102/order/o1", nonce: "nonce-b" });
    await assert.rejects(() => service.getOrder(ctx, 102, "o1", body), /账户不存在或不可用/);
    assert.deepEqual(lookupWhere, { id: "account-b", caId: 102 });
  });

  it("订单查询始终带上URL中的CA id", async () => {
    const service: any = new AcmeServerService();
    let lookupWhere: any = null;
    service.orderRepository = {
      async findOne(args: any) {
        lookupWhere = args.where;
        return null;
      },
    };
    await assert.rejects(() => service.getOrderForAccount(102, "order-b", "account-b"), /订单不存在/);
    assert.deepEqual(lookupWhere, { id: "order-b", caId: 102 });
  });

  it("EAB凭证按URL中的CA id查找，不能跨CA复用", async () => {
    const service: any = new AcmeServerService();
    const calls: any[] = [];
    service.issuer = {
      async getCaBaseUrl() {
        return "https://certd.example.com";
      },
      async getAcmeEabSecret(caId: number, kid: string) {
        calls.push([caId, kid]);
        return null;
      },
    };
    const jwk = { kty: "EC", crv: "P-256", x: "x-value", y: "y-value" };
    const eab = {
      protected: base64urlEncode(
        JSON.stringify({
          alg: "HS256",
          kid: "eab-from-ca-a",
          url: "https://certd.example.com/api/acme/102/new-account",
        })
      ),
      payload: base64urlEncode(JSON.stringify(jwk)),
      signature: base64urlEncode("signature"),
    };
    await assert.rejects(() => service.verifyExternalAccountBinding(102, eab, jwkThumbprint(jwk)), /EAB凭证不可用/);
    assert.deepEqual(calls, [[102, "eab-from-ca-a"]]);
  });
});

describe("AcmeServerService finalize authorization", () => {
  it("EAB特权关闭后未完成的直签订单不能签发", () => {
    const service: any = new AcmeServerService();
    assert.doesNotThrow(() => service.assertDirectIssueAllowed({ directIssue: true }, { privileged: true }));
    assert.doesNotThrow(() => service.assertDirectIssueAllowed({ directIssue: false }, { privileged: false }));
    assert.throws(() => service.assertDirectIssueAllowed({ directIssue: true }, { privileged: false }), /特权已关闭/);
  });

  it("EAB 禁用后已有订单不能 finalize", async () => {
    const service: any = new AcmeServerService();
    service.issuer = { getAcmeEabProfile: async () => null };
    const account: any = { eabId: "eab-1" };
    const order: any = { identifiers: JSON.stringify([{ type: "dns", value: "old.example.com" }]) };
    await assert.rejects(() => service.assertOrderStillAuthorized({ allowedDomains: null }, account, order), /EAB凭证已禁用或过期/);
  });

  it("EAB 域名范围收紧后已有订单不能 finalize", async () => {
    const service: any = new AcmeServerService();
    service.issuer = {
      async getAcmeEabProfile() {
        return { id: "eab-1", allowedDomains: ["new.example.com"] };
      },
    };
    const account: any = { eabId: "eab-1" };
    const order: any = { identifiers: JSON.stringify([{ type: "dns", value: "old.example.com" }]) };
    await assert.rejects(() => service.assertOrderStillAuthorized({ allowedDomains: null }, account, order), /不在该CA允许签发的范围内/);
  });
});

describe("AcmeServerService ACME三档门禁", () => {
  function createGateService(acmeConfig: any) {
    const service: any = new AcmeServerService();
    service.issuer = {
      async getAcmeAccessView() {
        return { id: 2, caType: "intermediate", acmeEnabled: true, acmeConfig: acmeConfig == null ? null : JSON.stringify(acmeConfig) };
      },
    };
    return service;
  }
  function createCtx(ip: string, headers: Record<string, string> = {}) {
    return {
      ip,
      req: { socket: { remoteAddress: ip } },
      get(name: string) {
        return headers[name.toLowerCase()] || "";
      },
      set() {},
    };
  }

  it("仅本地档拒绝外部IP，放行回环IPv4/IPv6", async () => {
    const service = createGateService({ acmeMode: "local", internalToken: "tok" });
    await assert.rejects(() => service.assertAccess(createCtx("203.0.113.9"), 2), /仅本地模式/);
    await service.assertAccess(createCtx("127.0.0.1"), 2);
    await service.assertAccess(createCtx("::1"), 2);
    await service.assertAccess(createCtx("::ffff:127.0.0.1"), 2);
  });

  it("仅本地档携带正确内部凭证的外部IP放行，错误凭证拒绝", async () => {
    const service = createGateService({ acmeMode: "local", internalToken: "tok" });
    await service.assertAccess(createCtx("203.0.113.9", { "x-certd-acme-token": "tok" }), 2);
    await assert.rejects(() => service.assertAccess(createCtx("203.0.113.9", { "x-certd-acme-token": "wrong" }), 2), /仅本地模式/);
  });

  it("标准档（含legacy缺省）未配置白名单时默认仅内网，0.0.0.0/0显式放行全部", async () => {
    const legacy = createGateService(null);
    await legacy.assertAccess(createCtx("10.1.2.3"), 2);
    await legacy.assertAccess(createCtx("127.0.0.1"), 2);
    await assert.rejects(() => legacy.assertAccess(createCtx("203.0.113.9"), 2), /白名单/);
    const open = createGateService({ acmeMode: "standard", ipAllowlist: ["0.0.0.0/0"] });
    await open.assertAccess(createCtx("203.0.113.9"), 2);
    const standard = createGateService({ acmeMode: "standard", ipAllowlist: ["10.0.0.0/8"] });
    await standard.assertAccess(createCtx("10.1.2.3"), 2);
    await assert.rejects(() => standard.assertAccess(createCtx("203.0.113.9"), 2), /白名单/);
  });

  it("仅本地档与IP白名单叠加生效", async () => {
    const service = createGateService({ acmeMode: "local", internalToken: "tok", ipAllowlist: ["10.0.0.0/8"] });
    // 回环来源不在白名单内仍被拒绝
    await assert.rejects(() => service.assertAccess(createCtx("127.0.0.1"), 2), /白名单/);
    await service.assertAccess(createCtx("10.1.2.3", { "x-certd-acme-token": "tok" }), 2);
  });
});

describe("AcmeServerService 门禁XFF伪造与吊销豁免回归", () => {
  function createGate(acmeConfig: any, socketIp: string, headers: Record<string, string> = {}) {
    const service: any = new AcmeServerService();
    service.issuer = {
      async getAcmeAccessView() {
        return { id: 2, caType: "intermediate", acmeEnabled: true, acmeConfig: acmeConfig == null ? null : JSON.stringify(acmeConfig) };
      },
    };
    const ctx = {
      req: { socket: { remoteAddress: socketIp } },
      get(name: string) {
        return headers[name.toLowerCase()] || "";
      },
      set() {},
    };
    return { service, ctx };
  }

  it("local档：直连伪造XFF回环被拒绝", async () => {
    const { service, ctx } = createGate({ acmeMode: "local", internalToken: "tok" }, "203.0.113.9", { "x-forwarded-for": "127.0.0.1" });
    await assert.rejects(() => service.assertAccess(ctx, 2), /仅本地模式/);
  });

  it("local档：经反代伪造XFF左侧回环被拒绝", async () => {
    const { service, ctx } = createGate({ acmeMode: "local", internalToken: "tok" }, "127.0.0.1", { "x-forwarded-for": "127.0.0.1, 203.0.113.9" });
    await assert.rejects(() => service.assertAccess(ctx, 2), /仅本地模式/);
  });

  it("local档：真实本机经反代放行", async () => {
    const { service, ctx } = createGate({ acmeMode: "local", internalToken: "tok" }, "127.0.0.1", { "x-forwarded-for": "127.0.0.1" });
    await service.assertAccess(ctx, 2);
  });

  it("standard档：默认内网白名单不被伪造XFF绕过", async () => {
    const { service, ctx } = createGate(null, "203.0.113.9", { "x-forwarded-for": "10.0.0.5" });
    await assert.rejects(() => service.assertAccess(ctx, 2), /白名单/);
    const viaProxy = createGate(null, "127.0.0.1", { "x-forwarded-for": "10.0.0.5, 203.0.113.9" });
    await assert.rejects(() => viaProxy.service.assertAccess(viaProxy.ctx, 2), /白名单/);
  });

  it("socket模式不信任任何转发头", async () => {
    const { service, ctx } = createGate({ acmeMode: "local", internalToken: "tok", clientIpSource: "socket" }, "127.0.0.1", { "x-forwarded-for": "203.0.113.9" });
    await service.assertAccess(ctx, 2);
  });

  it("header模式取指定头（CDN/反代注入）", async () => {
    const denied = createGate({ acmeMode: "local", internalToken: "tok", clientIpSource: "header", clientIpHeader: "X-Real-IP" }, "127.0.0.1", { "x-real-ip": "203.0.113.9" });
    await assert.rejects(() => denied.service.assertAccess(denied.ctx, 2), /仅本地模式/);
    const allowed = createGate({ acmeMode: "local", internalToken: "tok", clientIpSource: "header", clientIpHeader: "X-Real-IP" }, "127.0.0.1", { "x-real-ip": "127.0.0.1" });
    await allowed.service.assertAccess(allowed.ctx, 2);
  });

  it("关闭ACME后吊销端点仍可通过门禁", async () => {
    const service: any = new AcmeServerService();
    service.issuer = {
      async getAcmeAccessView() {
        return { id: 2, caType: "intermediate", acmeEnabled: false, disabled: true, acmeConfig: null };
      },
    };
    const ctx = { req: { socket: { remoteAddress: "127.0.0.1" } }, get: () => "", set() {} };
    await assert.rejects(() => service.assertAccess(ctx, 2), /ACME服务未启用/);
    await service.assertAccess(ctx, 2, { revoke: true });
  });
});
