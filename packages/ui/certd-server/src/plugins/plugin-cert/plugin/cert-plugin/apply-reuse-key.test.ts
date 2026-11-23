import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { CertApplyPlugin } from "./apply.js";

function rsa2048() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  }).privateKey;
}

function createPlugin() {
  const plugin: any = new CertApplyPlugin();
  plugin.logger = { info() {}, warn() {}, error() {}, debug() {} };
  plugin.reuseKey = true;
  plugin.privateKeyType = "rsa_2048";
  return plugin;
}

describe("CertApplyPlugin reuse key", () => {
  it("算法一致时返回上次私钥", async () => {
    const key = rsa2048();
    const plugin = createPlugin();
    plugin.readLastCert = async () => ({ cert: { key } });
    assert.equal(await plugin.resolveReusePrivateKey(), key);
  });

  it("关闭开关、算法变化、缺失私钥或读取失败时回退生成新密钥", async () => {
    const key = rsa2048();
    const plugin = createPlugin();
    plugin.readLastCert = async () => ({ cert: { key } });
    plugin.reuseKey = false;
    assert.equal(await plugin.resolveReusePrivateKey(), undefined);

    plugin.reuseKey = true;
    plugin.privateKeyType = "rsa_4096";
    assert.equal(await plugin.resolveReusePrivateKey(), undefined);

    plugin.privateKeyType = "rsa_2048";
    plugin.readLastCert = async () => ({ cert: {} });
    assert.equal(await plugin.resolveReusePrivateKey(), undefined);

    plugin.readLastCert = async () => {
      throw new Error("read failed");
    };
    assert.equal(await plugin.resolveReusePrivateKey(), undefined);
  });
});
