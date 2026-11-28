import assert from "node:assert/strict";
import esmock from "esmock";

declare const describe: any;
declare const it: any;

describe("acmeAccount 账户JSON不暴露EAB HMAC Key", () => {
  it("onGenerateAccount返回的account.eab仅含KID与使用时间，不含hmacKey", async function (this: any) {
    this.timeout(20000);
    class FakeAcmeService {
      opts: any;
      constructor(opts: any) {
        this.opts = opts;
      }
      buildAccountKey(email: string) {
        return "acme.config." + email;
      }
      async getAcmeClient(email: string) {
        await this.opts.userContext.setObj(this.buildAccountKey(email), { key: "ACCOUNT_KEY_PEM" });
        return { getAccountUrl: () => "https://ca.example.com/api/acme/2/account/acc1" };
      }
    }
    const { AcmeAccountAccess } = await esmock("./acme-account-access.js", {
      "../plugin/cert-plugin/acme.js": { AcmeService: FakeAcmeService },
    });
    const access: any = new AcmeAccountAccess();
    access.caType = "local-ca-2";
    access.email = "user@example.com";
    access.eabKid = "eab-kid-1";
    access.eabHmacKey = "SUPER_SECRET_HMAC";
    access.ctx = {
      serviceGetter: {
        async get(name: string) {
          if (name === "customAcmeProviderService") {
            return { getBySslProvider: async () => ({ builtIn: false, needEAB: true, directoryUrl: "https://ca.example.com/api/acme/2/directory" }) };
          }
          if (name === "localCaGetter") {
            return { getCa: async () => ({ localAcmeToken: "tok" }) };
          }
          return null;
        },
      },
      logger: { info() {}, warn() {}, error() {} },
    };
    const accountJson = await access.onGenerateAccount();
    const account = JSON.parse(accountJson);
    assert.equal(account.eab.kid, "eab-kid-1");
    assert.ok(account.eab.usedAt > 0);
    assert.equal(account.eab.hmacKey, undefined, "account.eab不得包含hmacKey");
    assert.ok(!accountJson.includes("SUPER_SECRET_HMAC"), "账户JSON不得泄漏HMAC Key");
  });
});