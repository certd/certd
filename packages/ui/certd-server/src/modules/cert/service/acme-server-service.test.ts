import assert from "node:assert/strict";
import { AcmeServerService, sanitizePublicJwk } from "./acme-server-service.js";

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
