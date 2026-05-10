import assert from "assert";
import { AcmeService } from "./acme.js";

const logger = {
  info() {},
  error() {},
  warn() {},
  debug() {},
};

describe("AcmeService account config", () => {
  it("keeps legacy email-based account config when EAB has no saved account key", async () => {
    const userContext = {
      async getObj(key: string) {
        if (key === "acme.config.google.user@example.com") {
          return {
            key: "legacy-email-key",
            accountUrl: "https://dv.acme-v02.api.pki.goog/acme/acct/legacy",
          };
        }
        return null;
      },
      async setObj() {},
    };
    const service = new AcmeService({
      userId: 1,
      userContext: userContext as any,
      logger: logger as any,
      sslProvider: "google",
      eab: {
        id: 12,
        kid: "kid-1",
        hmacKey: "hmac",
      } as any,
      domainParser: {} as any,
    });

    const conf = await service.getAccountConfig("user@example.com", { enabled: false, mappings: {} });

    assert.equal(conf.key, "legacy-email-key");
    assert.equal(conf.accountUrl, "https://dv.acme-v02.api.pki.goog/acme/acct/legacy");
  });

  it("uses the account key saved on the EAB access before legacy email config", async () => {
    const userContext = {
      async getObj(key: string) {
        if (key === "acme.config.google.access.12") {
          return { accountUrl: "https://dv.acme-v02.api.pki.goog/acme/acct/1" };
        }
        if (key === "acme.config.google.user@example.com") {
          return { key: "legacy-email-key" };
        }
        return null;
      },
      async setObj() {},
    };
    const service = new AcmeService({
      userId: 1,
      userContext: userContext as any,
      logger: logger as any,
      sslProvider: "google",
      eab: {
        id: 12,
        kid: "kid-1",
        hmacKey: "hmac",
        accountKey: JSON.stringify({ kid: "kid-1", privateKey: "eab-account-key" }),
      } as any,
      domainParser: {} as any,
    });

    const conf = await service.getAccountConfig("user@example.com", { enabled: false, mappings: {} });

    assert.equal(conf.key, "eab-account-key");
    assert.equal(conf.accountUrl, "https://dv.acme-v02.api.pki.goog/acme/acct/1");
  });

  it("rejects an EAB account key generated for another kid", async () => {
    const service = new AcmeService({
      userId: 1,
      userContext: {} as any,
      logger: logger as any,
      sslProvider: "google",
      eab: {
        id: 12,
        kid: "kid-2",
        hmacKey: "hmac",
        accountKey: JSON.stringify({ kid: "kid-1", privateKey: "eab-account-key" }),
      } as any,
      domainParser: {} as any,
    });

    assert.throws(() => service.getEabAccountPrivateKey(), /请点击刷新重新生成ACME账号私钥/);
  });

  it("formats expired EAB errors with a Chinese recovery hint", () => {
    const service = new AcmeService({
      userId: 1,
      userContext: {} as any,
      logger: logger as any,
      sslProvider: "google",
      eab: {
        id: 12,
        kid: "kid-1",
        hmacKey: "hmac",
      } as any,
      domainParser: {} as any,
    });

    const error = service.formatCreateAccountError(new Error("Unknown external account binding (EAB) key. This may be due to the EAB key expiring"));

    assert.match(error.message, /EAB授权已失效或已过期/);
    assert.match(error.message, /请重新获取EAB授权并刷新ACME账号私钥后重试/);
  });
});
