import assert from "assert";
import { AcmeAccountAccess } from "./acme-account-access.js";
import { AcmeService } from "../plugin/cert-plugin/acme.js";

describe("AcmeAccountAccess", () => {
  it("requires generated account payload before use", () => {
    const access = new AcmeAccountAccess();

    assert.throws(() => access.getAccount(), /ACME账号信息无效/);
  });

  it("parses generated account payload", () => {
    const access = new AcmeAccountAccess();
    access.account = JSON.stringify({
      accountKey: "private-key",
      accountUri: "https://example.com/acct/1",
      caType: "letsencrypt",
      email: "user@example.com",
      directoryUrl: "https://example.com/directory",
    });

    const account = access.getAccount();

    assert.equal(account.accountKey, "private-key");
    assert.equal(account.accountUri, "https://example.com/acct/1");
  });

  it("generates account payload through acme service", async () => {
    const original = AcmeService.prototype.getAcmeClient;
    const calls: string[] = [];
    AcmeService.prototype.getAcmeClient = async function (email: string) {
      calls.push(email);
      await this.userContext.setObj(this.buildAccountKey(email), { key: "generated-key" });
      return {
        getAccountUrl() {
          return "https://example.com/acct/2";
        },
      } as any;
    };

    try {
      const access = new AcmeAccountAccess();
      access.caType = "google";
      access.email = "user@example.com";
      access.eabKid = "kid-1";
      access.eabHmacKey = "hmac-1";

      const account = JSON.parse(await access.onGenerateAccount());

      assert.equal(calls[0], "user@example.com");
      assert.equal(account.accountKey, "generated-key");
      assert.equal(account.accountUri, "https://example.com/acct/2");
      assert.equal(account.caType, "google");
      assert.equal(account.email, "user@example.com");
    } finally {
      AcmeService.prototype.getAcmeClient = original;
    }
  });
});
