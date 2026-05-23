import assert from "assert";
import { utils } from "@certd/basic";
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

describe("AcmeService challenge", () => {
  it("parses cname TXT full record to choose the delegated DNS zone", async () => {
    const parseCalls: string[] = [];
    const service = new AcmeService({
      userId: 1,
      userContext: {} as any,
      logger: logger as any,
      sslProvider: "letsencrypt",
      domainParser: {
        async parse(fullDomain: string) {
          parseCalls.push(fullDomain);
          if (fullDomain === "certd-key.cname.sub.example.com") {
            return "sub.example.com";
          }
          return "example.com";
        },
      } as any,
    });
    const dnsProvider = {
      usePunyCode() {
        return false;
      },
      async createRecord(recordReq: any) {
        assert.equal(recordReq.domain, "sub.example.com");
        assert.equal(recordReq.fullRecord, "certd-key.cname.sub.example.com");
        assert.equal(recordReq.hostRecord, "certd-key.cname");
        return { id: "record-id" };
      },
    } as any;

    await service.challengeCreateFn(
      {
        identifier: {
          value: "www.example.com",
        },
        challenges: [
          {
            type: "dns-01",
          },
        ],
      },
      async () => "key-auth",
      {
        domainsVerifyPlan: {
          "www.example.com": {
            type: "cname",
            domain: "www.example.com",
            mainDomain: "example.com",
            cnameVerifyPlan: {
              domain: "cname.sub.example.com",
              fullRecord: "certd-key.cname.sub.example.com",
              dnsProvider,
            },
          },
        },
      }
    );

    assert.deepEqual(parseCalls, ["www.example.com", "certd-key.cname.sub.example.com"]);
  });

  it("enables proxy mapping when acme directory request fails", async () => {
    const originalRequest = utils.http.request;
    utils.http.request = async () => {
      throw new Error("timeout");
    };

    try {
      const service = new AcmeService({
        userId: 1,
        userContext: {} as any,
        logger: logger as any,
        sslProvider: "google",
        domainParser: {} as any,
      });

      const urlMapping = await service.resolveUrlMapping("https://dv.acme-v02.api.pki.goog/directory");

      assert.equal(urlMapping.enabled, true);
      assert.equal(urlMapping.mappings["dv.acme-v02.api.pki.goog"], "gg.px.certd.handfree.work");
    } finally {
      utils.http.request = originalRequest;
    }
  });
});
