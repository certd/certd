import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { AcmeServerService, sanitizePublicJwk } from "./acme-server-service.js";
import { base64urlEncode, jwkThumbprint, verifyJwsSignature } from "../protocol/acme-jws.js";

function createJwsBody(header: any, payload: any = null) {
  return {
    protected: base64urlEncode(JSON.stringify({ alg: "RS256", ...header })),
    payload: payload == null ? "" : base64urlEncode(JSON.stringify(payload)),
    signature: base64urlEncode("signature"),
  };
}

function rsaJwk(bits = 2048) {
  return crypto.generateKeyPairSync("rsa", { modulusLength: bits }).publicKey.export({ format: "jwk" });
}

function ecJwk(namedCurve: "prime256v1" | "secp384r1" | "secp521r1") {
  return crypto.generateKeyPairSync("ec", { namedCurve }).publicKey.export({ format: "jwk" });
}

describe("AcmeServerService account JWK", () => {
  it("拒绝包含私钥参数的 JWK", () => {
    assert.throws(
      () => sanitizePublicJwk({ kty: "RSA", n: "n", e: "AQAB", d: "secret" }),
      (e: any) => String(e?.message || "").includes("不能包含私钥参数")
    );
    assert.throws(
      () => sanitizePublicJwk({ kty: "EC", crv: "P-256", x: "x", y: "y", d: "secret" }),
      (e: any) => String(e?.message || "").includes("不能包含私钥参数")
    );
  });

  it("合法RSA(>=2048)与EC(P-256/P-384)仅返回公钥字段", () => {
    const rsa = rsaJwk(2048);
    assert.deepEqual(sanitizePublicJwk({ ...rsa, use: "sig" }), { kty: "RSA", n: (rsa as any).n, e: (rsa as any).e });
    const p256 = ecJwk("prime256v1");
    assert.deepEqual(sanitizePublicJwk(p256), { kty: "EC", crv: "P-256", x: (p256 as any).x, y: (p256 as any).y });
    const p384 = ecJwk("secp384r1");
    assert.equal((sanitizePublicJwk(p384) as any).crv, "P-384");
  });

  it("拒绝弱密钥：RSA<2048、EC P-521、OKP", () => {
    assert.throws(
      () => sanitizePublicJwk(rsaJwk(1024)),
      (e: any) => String(e?.message || "").includes("RSA密钥长度不足")
    );
    assert.throws(
      () => sanitizePublicJwk(ecJwk("secp521r1")),
      (e: any) => String(e?.message || "").includes("P-256/P-384")
    );
    assert.throws(
      () => sanitizePublicJwk({ kty: "OKP", crv: "Ed25519", x: "abc" }),
      (e: any) => String(e?.message || "").includes("不支持的JWK类型")
    );
  });
});

describe("AcmeServerService JWS签名算法与曲线约束", () => {
  function decodeLike(header: any, signature = Buffer.from("sig")) {
    const protectedB64 = base64urlEncode(JSON.stringify(header));
    const payloadB64 = base64urlEncode(JSON.stringify({}));
    return {
      header,
      payloadRaw: payloadB64,
      payload: {},
      signingInput: Buffer.from(`${protectedB64}.${payloadB64}`),
      signature,
    } as any;
  }

  it("ES256对应P-256可通过真实签名验证", () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const jwk = publicKey.export({ format: "jwk" });
    const jws = decodeLike({ alg: "ES256", jwk });
    jws.signature = crypto.sign("sha256", jws.signingInput, { key: privateKey, dsaEncoding: "ieee-p1363" });
    assert.equal(verifyJwsSignature(jws, jwk), true);
  });

  it("ES256使用P-384密钥被拒绝（alg↔曲线必须匹配）", () => {
    const p384 = ecJwk("secp384r1");
    assert.throws(() => verifyJwsSignature(decodeLike({ alg: "ES256", jwk: p384 }), p384), /必须使用P-256/);
    const p256 = ecJwk("prime256v1");
    assert.throws(() => verifyJwsSignature(decodeLike({ alg: "ES384", jwk: p256 }), p256), /必须使用P-384/);
  });

  it("ES512不予支持", () => {
    const p521 = ecJwk("secp521r1");
    assert.throws(() => verifyJwsSignature(decodeLike({ alg: "ES512", jwk: p521 }), p521), /不支持签名算法/);
  });

  it("RS签名使用EC密钥或弱RSA被拒绝", () => {
    const p256 = ecJwk("prime256v1");
    assert.throws(() => verifyJwsSignature(decodeLike({ alg: "RS256", jwk: p256 }), p256), /密钥类型不匹配/);
    const weak = rsaJwk(1024);
    assert.throws(() => verifyJwsSignature(decodeLike({ alg: "RS256", jwk: weak }), weak), /RSA密钥长度不足/);
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
    service.issuer = {
      async getAcmeCa() {},
      async getCaBaseUrl() {
        return "https://certd.example.com";
      },
    };
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
    service.issuer = {
      async getAcmeCa() {},
      async getCaBaseUrl() {
        return "https://certd.example.com";
      },
    };
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
    service.issuer = {
      async getAcmeCa() {},
      async getCaBaseUrl() {
        return "https://certd.example.com";
      },
    };
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
    service.issuer = {
      async getAcmeCa() {},
      async getCaBaseUrl() {
        return "https://certd.example.com";
      },
    };
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

describe("AcmeServerService EAB不可恢复禁用", () => {
  it("revoked=true 的EAB即使disabled=false也拒绝注册", async () => {
    const service: any = new AcmeServerService();
    service.issuer = {
      async getCaBaseUrl() {
        return "https://certd.example.com";
      },
      async getAcmeEabSecret() {
        return { id: "eab-1", disabled: false, revoked: true, hmacKey: "key" };
      },
    };
    const jwk = { kty: "EC", crv: "P-256", x: "x-value", y: "y-value" };
    const eab = {
      protected: base64urlEncode(
        JSON.stringify({
          alg: "HS256",
          kid: "eab-1",
          url: "https://certd.example.com/api/acme/102/new-account",
        })
      ),
      payload: base64urlEncode(JSON.stringify(jwk)),
      signature: base64urlEncode("signature"),
    };
    await assert.rejects(() => service.verifyExternalAccountBinding(102, eab, jwkThumbprint(jwk)), /EAB凭证不可用/);
  });
});

describe("AcmeServerService 账户状态与EAB泄漏处置串行化", () => {
  function makeService(account: any, eab: any) {
    const service: any = new AcmeServerService();
    service.issuer = {
      async assertCaOwner() {},
      async getRotationChainWithNames() {
        return [{ id: 102 }];
      },
    };
    service.accountRepository = {
      manager: {
        connection: { options: { type: "better-sqlite3" } },
        async transaction(fn: any) {
          return await fn({
            connection: { options: { type: "better-sqlite3" } },
            getRepository: (entity: any) => {
              if (entity?.name === "AcmeEabEntity") {
                return {
                  async findOne() {
                    return eab;
                  },
                };
              }
              return service.accountRepository;
            },
          });
        },
      },
      async findOne() {
        return account;
      },
      async save(entity: any) {
        Object.assign(account, entity);
        return entity;
      },
    };
    return service;
  }

  it("EAB已revoked时禁止重新启用账户", async () => {
    const service = makeService({ id: "acc", caId: 102, eabId: "eab-1", status: "deactivated" }, { id: "eab-1", revoked: true });
    await assert.rejects(() => service.setAccountStatus(102, "acc", "valid", 1), /不能重新启用/);
  });

  it("EAB未revoked时可重新启用并写入valid", async () => {
    const account: any = { id: "acc", caId: 102, eabId: "eab-1", status: "deactivated" };
    const service = makeService(account, { id: "eab-1", revoked: false });
    await service.setAccountStatus(102, "acc", "valid", 1);
    assert.equal(account.status, "valid");
  });
});

describe("AcmeServerService finalize authorization", () => {
  it("EAB特权关闭后未完成的直签订单不能签发", () => {
    const service: any = new AcmeServerService();
    assert.doesNotThrow(() => service.assertDirectIssueAllowed({ directIssue: true }, { privileged: true }));
    assert.doesNotThrow(() => service.assertDirectIssueAllowed({ directIssue: false }, { privileged: false }));
    assert.throws(() => service.assertDirectIssueAllowed({ directIssue: true }, { privileged: false }), /特权已关闭/);
  });

  it("EAB 禁用后已注册账户仍可 finalize（EAB只管注册，账户独立）", async () => {
    const service: any = new AcmeServerService();
    service.issuer = { getAcmeEabProfile: async () => null };
    service.eabRepository = {
      async findOne() {
        return { id: "eab-1", allowedDomains: JSON.stringify(["old.example.com"]), privileged: false };
      },
    };
    const account: any = { eabId: "eab-1" };
    const order: any = { identifiers: JSON.stringify([{ type: "dns", value: "old.example.com" }]) };
    await assert.doesNotReject(() => service.assertOrderStillAuthorized({ allowedDomains: null }, account, order));
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

  it("不存在的CA返回明确业务错误而非内部异常", async () => {
    const service: any = new AcmeServerService();
    service.issuer = {
      async getAcmeAccessView() {
        return null;
      },
    };
    await assert.rejects(
      () => service.assertAccess(createCtx("127.0.0.1"), 999999),
      (e: any) => {
        assert.equal(e.type, "unauthorized");
        assert.equal(e.status, 403);
        return true;
      }
    );
  });

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

  it("仅本地档：内部凭证不受标准门禁影响，无凭证回环仍受白名单约束", async () => {
    const service = createGateService({
      acmeMode: "local",
      internalToken: "tok",
      ipAllowlist: ["10.0.0.0/8"],
      basicAuth: { enabled: true, username: "u", passwordHash: "$2a$10$abcdefghijklmnopqrstuv" },
      requiredHeaders: [{ name: "x-gateway", value: "ok" }],
    });
    // 回环但无内部凭证：仍受显式白名单/Basic/自定义头约束
    await assert.rejects(() => service.assertAccess(createCtx("127.0.0.1"), 2), /白名单/);
    // 标准模式遗留的门禁配置不阻断本地流水线的内部凭证请求
    await service.assertAccess(createCtx("203.0.113.9", { "x-certd-acme-token": "tok" }), 2);
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

  it("header模式：非可信来源伪造注入头被忽略并回退socket IP", async () => {
    // 直连公网来源伪造 X-Real-IP=127.0.0.1 不得放行本地档
    const forged = createGate({ acmeMode: "local", internalToken: "tok", clientIpSource: "header", clientIpHeader: "X-Real-IP" }, "203.0.113.9", { "x-real-ip": "127.0.0.1" });
    await assert.rejects(() => forged.service.assertAccess(forged.ctx, 2), /仅本地模式/);
    // 连接来源在显式可信代理网段时，注入头才被采信
    const viaTrusted = createGate({ acmeMode: "local", internalToken: "tok", clientIpSource: "header", clientIpHeader: "X-Real-IP", trustProxyCidrs: ["10.0.0.0/8"] }, "10.0.0.2", { "x-real-ip": "127.0.0.1" });
    await viaTrusted.service.assertAccess(viaTrusted.ctx, 2);
    // 非可信来源即使不在回环，也回退socket IP（10.0.0.2 → 非回环，拒绝）
    const untrustedProxy = createGate({ acmeMode: "local", internalToken: "tok", clientIpSource: "header", clientIpHeader: "X-Real-IP" }, "10.0.0.2", { "x-real-ip": "127.0.0.1" });
    await assert.rejects(() => untrustedProxy.service.assertAccess(untrustedProxy.ctx, 2), /仅本地模式/);
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

describe("AcmeServerService Basic Auth 强制HTTPS", () => {
  const passwordHash = bcrypt.hashSync("secret", 4);
  function makeService(basicEnabled: boolean, trustProxyCidrs: any = null) {
    const service: any = new AcmeServerService();
    const config = { acmeMode: "standard", ipAllowlist: ["0.0.0.0/0"], trustProxyCidrs, basicAuth: { enabled: basicEnabled, username: "user", passwordHash } };
    service.issuer = {
      async getAcmeAccessView() {
        return { id: 2, caType: "intermediate", acmeEnabled: true, acmeConfig: JSON.stringify(config) };
      },
    };
    return service;
  }
  function makeCtx(opts: { encrypted?: boolean; ip?: string; xfp?: string; auth?: string }) {
    const headers: Record<string, string> = {};
    if (opts.xfp) headers["x-forwarded-proto"] = opts.xfp;
    if (opts.auth) headers["authorization"] = opts.auth;
    return {
      req: { socket: { remoteAddress: opts.ip || "203.0.113.9", encrypted: opts.encrypted === true } },
      get: (name: string) => headers[name.toLowerCase()] || "",
      set() {},
    };
  }
  const basicHeader = "Basic " + Buffer.from("user:secret").toString("base64");

  it("直连HTTPS放行Basic认证", async () => {
    const service = makeService(true);
    await service.assertAccess(makeCtx({ encrypted: true, auth: basicHeader }), 2);
  });

  it("直连HTTP拒绝Basic认证（凭证处理前）", async () => {
    const service = makeService(true);
    await assert.rejects(() => service.assertAccess(makeCtx({ encrypted: false, auth: basicHeader }), 2), /HTTPS/);
  });

  it("可信反向代理传递HTTPS放行", async () => {
    const service = makeService(true, ["203.0.113.0/24"]);
    await service.assertAccess(makeCtx({ ip: "203.0.113.9", xfp: "https", auth: basicHeader }), 2);
  });

  it("非可信代理伪造X-Forwarded-Proto:https被拒绝", async () => {
    const service = makeService(true, ["10.0.0.0/8"]);
    await assert.rejects(() => service.assertAccess(makeCtx({ ip: "203.0.113.9", xfp: "https", auth: basicHeader }), 2), /HTTPS/);
  });

  it("Basic关闭时HTTP正常放行", async () => {
    const service = makeService(false);
    await service.assertAccess(makeCtx({ encrypted: false }), 2);
  });
});
