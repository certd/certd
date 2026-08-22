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

describe("AcmeAccountAccess custom CA", () => {
  it("颁发机构为空时 getDirectoryUrl 给出明确提示", async () => {
    const access = new AcmeAccountAccess();
    access.caType = null as any;

    await assert.rejects(() => access.getDirectoryUrl(), /请先选择颁发机构/);
  });

  it("custom caType 返回自定义 directoryUrl（旧版兼容）", async () => {
    const access = new AcmeAccountAccess();
    access.caType = "custom";
    access.directoryUrl = "https://myca.example.com/directory";

    assert.equal(await access.getDirectoryUrl(), "https://myca.example.com/directory");
  });

  it("custom caType 缺少 directoryUrl 时报错（旧版兼容）", async () => {
    const access = new AcmeAccountAccess();
    access.caType = "custom";
    access.directoryUrl = "";

    await assert.rejects(() => access.getDirectoryUrl(), /自定义ACME需要填写Directory URL/);
  });

  it("系统配置的自定义caType 从CustomAcmeProviderService读取 directoryUrl", async () => {
    const access = new AcmeAccountAccess();
    access.caType = "myca";
    access.ctx = {
      serviceGetter: {
        async get(name: string) {
          assert.equal(name, "customAcmeProviderService");
          return {
            async getBySslProvider(sslProvider: string) {
              assert.equal(sslProvider, "myca");
              return {
                sslProvider: "myca",
                title: "我的CA",
                directoryUrl: "https://myca.example.com/directory",
                reverseProxy: "myca-proxy.example.com",
                needEAB: true,
                builtIn: false,
              };
            },
          };
        },
      },
    } as any;

    assert.equal(await access.getDirectoryUrl(), "https://myca.example.com/directory");
  });

  it("内置caType 使用内置端点", async () => {
    const access = new AcmeAccountAccess();
    access.caType = "letsencrypt";
    access.ctx = {
      serviceGetter: {
        async get() {
          return {
            async getBySslProvider() {
              return { sslProvider: "letsencrypt", title: "Let's Encrypt", directoryUrl: "https://acme-v02.api.letsencrypt.org/directory", builtIn: true };
            },
          };
        },
      },
    } as any;

    assert.equal(await access.getDirectoryUrl(), "https://acme-v02.api.letsencrypt.org/directory");
  });

  it("系统配置的自定义caType 未配置时给出明确报错", async () => {
    const access = new AcmeAccountAccess();
    access.caType = "not-exist";
    access.ctx = {
      serviceGetter: {
        async get() {
          return {
            async getBySslProvider() {
              return undefined;
            },
          };
        },
      },
    } as any;

    await assert.rejects(() => access.getDirectoryUrl(), /未找到颁发机构【not-exist】的配置/);
  });

  it("onCaTypeList 返回系统配置的全部颁发机构（内置 + 自定义），并带 needEAB", async () => {
    const access = new AcmeAccountAccess();
    access.ctx = {
      serviceGetter: {
        async get() {
          return {
            async getAll() {
              return [
                { sslProvider: "letsencrypt", title: "Let's Encrypt", directoryUrl: "https://acme-v02.api.letsencrypt.org/directory", needEAB: false, builtIn: true },
                { sslProvider: "google", title: "Google", directoryUrl: "https://dv.acme-v02.api.pki.goog/directory", needEAB: true, builtIn: true },
                { sslProvider: "myca", title: "我的CA", directoryUrl: "https://myca.example.com/directory", needEAB: true, builtIn: false },
              ];
            },
          };
        },
      },
    } as any;

    const options = await access.onCaTypeList();

    const values = options.map((item: any) => item.value);
    assert.ok(values.includes("letsencrypt"));
    assert.ok(values.includes("google"));
    assert.ok(values.includes("myca"));
    // 旧版 custom 入口不在
    assert.equal(values.includes("custom"), false);
    // 选项带 needEAB 字段
    const google = options.find((item: any) => item.value === "google");
    assert.equal(google.needEAB, true);
    const myca = options.find((item: any) => item.value === "myca");
    assert.equal(myca.needEAB, true);
  });

  it("custom caType 无需 EAB 也能生成账号，并记录 directoryUrl", async () => {
    const original = AcmeService.prototype.getAcmeClient;
    AcmeService.prototype.getAcmeClient = async function (email: string) {
      await this.userContext.setObj(this.buildAccountKey(email), { key: "generated-key" });
      return {
        getAccountUrl() {
          return "https://myca.example.com/acct/1";
        },
      } as any;
    };

    try {
      const access = new AcmeAccountAccess();
      access.caType = "custom";
      access.directoryUrl = "https://myca.example.com/directory";
      access.email = "user@example.com";
      access.eabKid = "";
      access.eabHmacKey = "";

      const account = JSON.parse(await access.onGenerateAccount());

      assert.equal(account.caType, "custom");
      assert.equal(account.directoryUrl, "https://myca.example.com/directory");
      assert.equal(account.accountUri, "https://myca.example.com/acct/1");
      assert.equal(account.eab, undefined);
    } finally {
      AcmeService.prototype.getAcmeClient = original;
    }
  });
});
