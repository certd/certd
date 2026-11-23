import assert from "node:assert/strict";
import { AcmeServerService, sanitizePublicJwk } from "./acme-server-service.js";
import { base64urlEncode, jwkThumbprint } from "./acme-jws.js";

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

describe("AcmeServerService CA isolation", () => {
  it("每个中间CA拥有独立的Directory和端点URL", async () => {
    const service: any = new AcmeServerService();
    service.localCaService = {
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
    service.localCaService = { async getAcmeCa() {} };
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

  it("账号kid中的CA路径匹配时，查询仍带URL中的CA id", async () => {
    const service: any = new AcmeServerService();
    service.localCaService = { async getAcmeCa() {} };
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
    service.localCaService = {
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
    await assert.rejects(() => service.verifyExternalAccountBinding(102, eab, jwkThumbprint(jwk)), /EAB凭证不存在或已禁用/);
    assert.deepEqual(calls, [[102, "eab-from-ca-a"]]);
  });
});

describe("AcmeServerService finalize authorization", () => {
  it("EAB 禁用后已有订单不能 finalize", async () => {
    const service: any = new AcmeServerService();
    service.localCaService = { getAcmeEabProfile: async () => null };
    const account: any = { eabId: "eab-1" };
    const order: any = { identifiers: JSON.stringify([{ type: "dns", value: "old.example.com" }]) };
    await assert.rejects(() => service.assertOrderStillAuthorized({ allowedDomains: null }, account, order), /EAB凭证已禁用或过期/);
  });

  it("EAB 域名范围收紧后已有订单不能 finalize", async () => {
    const service: any = new AcmeServerService();
    service.localCaService = {
      async getAcmeEabProfile() {
        return { id: "eab-1", allowedDomains: ["new.example.com"] };
      },
    };
    const account: any = { eabId: "eab-1" };
    const order: any = { identifiers: JSON.stringify([{ type: "dns", value: "old.example.com" }]) };
    await assert.rejects(() => service.assertOrderStillAuthorized({ allowedDomains: null }, account, order), /不在该CA允许签发的范围内/);
  });
});
