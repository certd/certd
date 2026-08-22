import assert from "assert";
import esmock from "esmock";
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

describe("AcmeService custom directoryUrl", () => {
  it("传入 directoryUrl 时使用自定义ACME端点，不再调用内置目录", async () => {
    const originalRequest = utils.http.request;
    utils.http.request = async () => ({});
    try {
      let recordedDirectoryUrl: string | null = null;
      const { AcmeService: CustomAcmeService } = await esmock("./acme.js", {
        "@certd/acme-client": {
          getDirectoryUrl() {
            throw new Error("不应调用内置目录获取");
          },
          getSslProviderReverseProxies: () => ({}),
          Client: class {
            constructor(opts: any) {
              recordedDirectoryUrl = opts.directoryUrl;
            }
            async createAccount() {}
            getAccountUrl() {
              return "https://myca.example.com/acct/1";
            }
          },
          crypto: {
            createPrivateKey: async () => "account-key",
          },
        },
      });

      const service = new CustomAcmeService({
        userId: 1,
        userContext: {
          async getObj() {
            return { key: "account-key" };
          },
          async setObj() {},
        } as any,
        logger: logger as any,
        sslProvider: "custom",
        directoryUrl: "https://myca.example.com/directory",
        domainParser: {} as any,
      });

      await service.getAcmeClient("user@example.com");

      assert.equal(recordedDirectoryUrl, "https://myca.example.com/directory");
    } finally {
      utils.http.request = originalRequest;
    }
  });

  it("custom 颁发机构未传 directoryUrl 时报错", async () => {
    const { AcmeService: CustomAcmeService } = await esmock("./acme.js", {
      "@certd/acme-client": {
        getDirectoryUrl() {
          throw new Error("内置目录中不存在 custom");
        },
      },
    });

    const service = new CustomAcmeService({
      userId: 1,
      userContext: {} as any,
      logger: logger as any,
      sslProvider: "custom",
      domainParser: {} as any,
    });

    await assert.rejects(() => service.getAcmeClient("user@example.com"), /自定义ACME需要填写Directory URL/);
  });
});
