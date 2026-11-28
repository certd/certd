import assert from "node:assert/strict";
import crypto, { createPublicKey, generateKeyPairSync } from "node:crypto";
import * as x509 from "@peculiar/x509";
import { createOrderCsr } from "./acme.js";
import { isPrivateKeyCompatible } from "./cert-key-reuse.js";

function rsaKey(bits = 2048, type: "pkcs1" | "pkcs8" = "pkcs8") {
  return generateKeyPairSync("rsa", {
    modulusLength: bits,
    privateKeyEncoding: { type, format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  }).privateKey;
}

function ecKey(curve: "prime256v1" | "secp384r1") {
  return generateKeyPairSync("ec", {
    namedCurve: curve,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  }).privateKey;
}

function publicKeyPem(privateKey: string) {
  return createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString().trim();
}

async function assertCsrUsesKey(csr: Buffer, privateKey: string) {
  const request = new x509.Pkcs10CertificateRequest(csr.toString());
  assert.equal(request.publicKey.toString("pem").trim(), publicKeyPem(privateKey));
  assert.equal(await request.verify(crypto.webcrypto as any), true, "CSR签名必须可以用对应私钥验证");
}

describe("ACME CSR reuse integration", () => {
  const cases = [
    { name: "RSA 2048 PKCS#8", key: rsaKey(2048, "pkcs8"), type: "rsa_2048" },
    { name: "RSA 2048 PKCS#1", key: rsaKey(2048, "pkcs1"), type: "rsa_2048_pkcs1" },
    { name: "EC P-256", key: ecKey("prime256v1"), type: "ec_256" },
    { name: "EC P-384", key: ecKey("secp384r1"), type: "ec_384" },
  ];

  for (const item of cases) {
    it(`复用 ${item.name} 时CSR公钥和签名不变`, async () => {
      const result = await createOrderCsr({
        domains: ["reuse.example.com"],
        privateKeyType: item.type,
        reusePrivateKey: item.key,
      });
      assert.equal(result.reused, true);
      assert.equal(result.key.toString(), item.key);
      await assertCsrUsesKey(result.csr, item.key);
    });
  }

  it("未启用复用时生成新私钥", async () => {
    const oldKey = rsaKey(2048);
    const result = await createOrderCsr({ domains: ["new.example.com"], privateKeyType: "rsa_2048" });
    assert.equal(result.reused, false);
    assert.notEqual(publicKeyPem(result.key.toString()), publicKeyPem(oldKey));
    await assertCsrUsesKey(result.csr, result.key.toString());
  });

  it("算法不匹配时不复用旧私钥", async function (this: any) {
    // RSA 4096 在低配 CI 上生成可能超过默认 2s
    this.timeout(20000);
    const oldKey = rsaKey(2048);
    assert.equal(isPrivateKeyCompatible(oldKey, "rsa_4096"), false);
    const result = await createOrderCsr({ domains: ["rotate.example.com"], privateKeyType: "rsa_4096" });
    assert.notEqual(publicKeyPem(result.key.toString()), publicKeyPem(oldKey));
    await assertCsrUsesKey(result.csr, result.key.toString());
  });
});
