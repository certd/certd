import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { isPrivateKeyCompatible } from "./cert-key-reuse.js";

function rsaKey(bits = 2048, type: "pkcs1" | "pkcs8" = "pkcs8") {
  return generateKeyPairSync("rsa", {
    modulusLength: bits,
    privateKeyEncoding: { type, format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  }).privateKey;
}

function ecKey(curve: "prime256v1" | "secp384r1" = "prime256v1") {
  return generateKeyPairSync("ec", {
    namedCurve: curve,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  }).privateKey;
}

describe("cert-key-reuse", () => {
  it("按算法和长度判断旧私钥是否可复用", () => {
    assert.equal(isPrivateKeyCompatible(rsaKey(2048), "rsa_2048"), true);
    assert.equal(isPrivateKeyCompatible(rsaKey(2048), "rsa_2048_pkcs1"), true);
    assert.equal(isPrivateKeyCompatible(rsaKey(2048), "rsa_4096"), false);
    assert.equal(isPrivateKeyCompatible(ecKey("prime256v1"), "ec_256"), true);
    assert.equal(isPrivateKeyCompatible(ecKey("prime256v1"), "ec_384"), false);
    assert.equal(isPrivateKeyCompatible(ecKey("secp384r1"), "ec_384"), true);
    assert.equal(isPrivateKeyCompatible("not-a-key", "rsa_2048"), false);
  });
});
