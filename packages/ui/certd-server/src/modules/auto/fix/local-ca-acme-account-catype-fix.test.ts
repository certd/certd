import assert from "node:assert/strict";
import { LocalCaAcmeAccountCaTypeFix } from "./local-ca-acme-account-catype-fix.js";

function createFix(rows: any[]) {
  const fix = new LocalCaAcmeAccountCaTypeFix();
  const updates: any[] = [];
  (fix as any).repository = {
    async find() {
      return rows;
    },
    async update(where: any, data: any) {
      updates.push({ where, data });
    },
  };
  (fix as any).encryptService = {
    decrypt(value: string) {
      if (value.startsWith("enc:")) {
        return value.slice(4);
      }
      throw new Error("decrypt failed");
    },
  };
  return { fix, updates };
}

function createRow(id: number, account: any, encrypt = true) {
  return {
    id,
    type: "acmeAccount",
    subtype: "custom",
    setting: JSON.stringify({ caType: "custom" }),
    encryptSetting: JSON.stringify({ account: { value: `enc:${JSON.stringify(account)}`, encrypt } }),
  };
}

describe("LocalCaAcmeAccountCaTypeFix", () => {
  it("本地CA目录的legacy账号迁移为local-ca-N", async () => {
    const row = createRow(1, { directoryUrl: "https://certd.example.com/api/acme/3/directory", accountKey: "k", accountUri: "u" });
    const { fix, updates } = createFix([row]);
    assert.equal(await fix.init(), true);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].data.subtype, "local-ca-3");
    assert.equal(JSON.parse(updates[0].data.setting).caType, "local-ca-3");
    // 不动加密的account内容
    assert.equal(updates[0].data.encryptSetting, undefined);
  });

  it("外部ACME账号不迁移", async () => {
    const row = createRow(2, { directoryUrl: "https://acme-v02.api.letsencrypt.org/directory" });
    const { fix, updates } = createFix([row]);
    assert.equal(await fix.init(), true);
    assert.equal(updates.length, 0);
  });

  it("解密失败或无账号内容的行跳过，不影响其他行", async () => {
    const bad = createRow(3, { directoryUrl: "https://certd.example.com/api/acme/5/directory" });
    bad.encryptSetting = JSON.stringify({ account: { value: "broken", encrypt: true } });
    const empty = { id: 4, type: "acmeAccount", subtype: "custom", setting: "{}", encryptSetting: "{}" };
    const good = createRow(5, { directoryUrl: "https://certd.example.com/api/acme/6/directory" });
    const { fix, updates } = createFix([bad, empty, good]);
    assert.equal(await fix.init(), true);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].where.id, 5);
  });
});