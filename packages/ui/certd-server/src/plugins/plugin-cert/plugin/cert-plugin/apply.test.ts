import assert from "assert";
import { utils } from "@certd/basic";
import { NonRetryableException } from "@certd/lib-server";
import { CertApplyPlugin } from "./apply.js";

describe("CertApplyPlugin dns-persist verify plan", () => {
  it("keeps dns-persist entries when building mixed domain verify plans", async () => {
    const plugin: any = new CertApplyPlugin();
    plugin.acme = {
      options: {
        domainParser: {
          async parse(domain: string) {
            return domain;
          },
        },
      },
    };

    const plan = await plugin.createDomainsVerifyPlan(
      ["*.handfree.work"],
      {
        "handfree.work": {
          domain: "handfree.work",
          type: "dns-persist",
          dnsPersistVerifyPlan: {
            "handfree.work": {
              domain: "handfree.work",
              status: "valid",
              hostRecord: "_validation-persist",
              recordValue: "letsencrypt.org; accounturi=https://acme.example/acct/1; policy=wildcard",
              accountUri: "https://acme.example/acct/1",
            },
          },
        },
      },
      {
        accountKey: "private-key",
        accountUri: "https://acme.example/acct/1",
        caType: "letsencrypt_staging",
        email: "user@example.com",
        directoryUrl: "https://acme-staging-v02.api.letsencrypt.org/directory",
      }
    );

    assert.equal(plan["handfree.work"].type, "dns-persist");
    assert.equal(plan["handfree.work"].dnsPersistVerifyPlan?.hostRecord, "_validation-persist");
    assert.equal(plan["handfree.work"].dnsPersistVerifyPlan?.recordValue, "letsencrypt.org; accounturi=https://acme.example/acct/1; policy=wildcard");
  });
});

describe("CertApplyPlugin certificate apply retry", () => {
  it("retries once by default", async () => {
    const plugin: any = new CertApplyPlugin();
    let orderCount = 0;
    const waitTimes: number[] = [];
    const error = new Error("apply failed");
    plugin.logger = { warn() {} };
    plugin.acme = {
      async order() {
        orderCount++;
        throw error;
      },
    };

    const originalSleep = utils.sleep;
    utils.sleep = async (waitTime: number) => {
      waitTimes.push(waitTime);
    };

    try {
      await assert.rejects(plugin.orderWithRetry({}), error);
      assert.equal(orderCount, 2);
      assert.deepEqual(waitTimes, [30_000]);
    } finally {
      utils.sleep = originalSleep;
    }
  });

  it("retries after a 30-second cooldown and succeeds before reaching the limit", async () => {
    const plugin: any = new CertApplyPlugin();
    let orderCount = 0;
    const waitTimes: number[] = [];
    plugin.certApplyRetryCount = 2;
    plugin.logger = { warn() {} };
    plugin.acme = {
      async order() {
        orderCount++;
        if (orderCount < 3) {
          throw new Error(`apply failed ${orderCount}`);
        }
        return { crt: "certificate", key: "private-key" };
      },
    };
    const originalSleep = utils.sleep;
    utils.sleep = async (waitTime: number) => {
      waitTimes.push(waitTime);
    };

    try {
      const cert = await plugin.orderWithRetry({});

      assert.deepEqual(cert, { crt: "certificate", key: "private-key" });
      assert.equal(orderCount, 3);
      assert.deepEqual(waitTimes, [30_000, 30_000]);
    } finally {
      utils.sleep = originalSleep;
    }
  });

  it("throws the last error after reaching the retry limit", async () => {
    const plugin: any = new CertApplyPlugin();
    let orderCount = 0;
    const error = new Error("apply failed");
    plugin.certApplyRetryCount = 1;
    plugin.logger = { warn() {} };
    plugin.acme = {
      async order() {
        orderCount++;
        throw error;
      },
    };
    const originalSleep = utils.sleep;
    utils.sleep = async () => {};

    try {
      await assert.rejects(plugin.orderWithRetry({}), error);
      assert.equal(orderCount, 2);
    } finally {
      utils.sleep = originalSleep;
    }
  });

  it("does not retry a cancelled apply", async () => {
    const plugin: any = new CertApplyPlugin();
    let orderCount = 0;
    const error: any = new Error("cancelled");
    error.name = "CancelError";
    plugin.certApplyRetryCount = 2;
    plugin.logger = { warn() {} };
    plugin.acme = {
      async order() {
        orderCount++;
        throw error;
      },
    };

    await assert.rejects(plugin.orderWithRetry({}), error);
    assert.equal(orderCount, 1);
  });

  it("throws a non-retryable error for wildcard and normal domain conflicts", async () => {
    const plugin: any = new CertApplyPlugin();
    let orderCount = 0;
    const message = "example.com is redundant with a wildcard domain in the same request";
    plugin.certApplyRetryCount = 2;
    plugin.logger = { warn() {} };
    plugin.acme = {
      async order() {
        orderCount++;
        throw new NonRetryableException(`通配符域名已经包含了普通域名，请删除其中一个（${message}）`);
      },
    };
    await assert.rejects(plugin.orderWithRetry({}), (error: any) => {
      assert.equal(error instanceof NonRetryableException, true);
      assert.equal(error.message, `通配符域名已经包含了普通域名，请删除其中一个（${message}）`);
      return true;
    });
    assert.equal(orderCount, 1);
  });
});

describe("CertApplyPlugin custom 颁发机构", () => {
  function createCustomAcmeServiceGetter(customAcmeProviderService: any) {
    return {
      async get(name: string) {
        if (name === "customAcmeProviderService") {
          return customAcmeProviderService;
        }
        return {};
      },
    };
  }

  it("getAcmeClient 懒加载应用自定义ACME配置（directoryUrl、reverseProxy）", async () => {
    const plugin: any = new CertApplyPlugin();
    plugin.version = 2;
    plugin.sslProvider = "myca";
    plugin.email = "user@example.com";
    plugin.logger = { info() {}, warn() {}, error() {}, debug() {} };
    plugin.userContext = {};
    plugin.ctx = {
      serviceGetter: createCustomAcmeServiceGetter({
        async getBySslProvider(sslProvider: string) {
          assert.equal(sslProvider, "myca");
          return {
            sslProvider: "myca",
            title: "我的CA",
            directoryUrl: "https://myca.example.com/directory",
            reverseProxy: "myca-proxy.example.com",
            builtIn: false,
          };
        },
      }),
      user: { id: 1 },
      signal: undefined,
    };

    const client = await plugin.getAcmeClient();

    // 懒加载：首次调用构建 AcmeService 并应用颁发机构配置
    assert.equal(plugin.acme.options.directoryUrl, "https://myca.example.com/directory");
    // 自定义ACME配置了反向代理地址时优先使用
    assert.equal(plugin.acme.options.reverseProxy, "myca-proxy.example.com");
    // 第二次调用返回同一实例（懒加载缓存）
    assert.equal(await plugin.getAcmeClient(), client);
  });

  it("内置颁发机构懒加载时不传自定义 directoryUrl", async () => {
    const plugin: any = new CertApplyPlugin();
    plugin.version = 2;
    plugin.sslProvider = "letsencrypt";
    plugin.email = "user@example.com";
    plugin.logger = { info() {}, warn() {}, error() {}, debug() {} };
    plugin.userContext = {};
    plugin.ctx = {
      serviceGetter: createCustomAcmeServiceGetter({
        async getBySslProvider(sslProvider: string) {
          assert.equal(sslProvider, "letsencrypt");
          return {
            sslProvider: "letsencrypt",
            title: "Let's Encrypt",
            directoryUrl: "",
            builtIn: true,
          };
        },
      }),
      user: { id: 1 },
      signal: undefined,
    };

    await plugin.getAcmeClient();

    // 内置颁发机构走内置端点，不传自定义 directoryUrl
    assert.equal(plugin.acme.options.directoryUrl, undefined);
  });

  it("自定义ACME未配置时 getAcmeClient 给出明确报错", async () => {
    const plugin: any = new CertApplyPlugin();
    plugin.version = 2;
    plugin.sslProvider = "not-exist";
    plugin.logger = { info() {}, warn() {}, error() {}, debug() {} };
    plugin.ctx = {
      serviceGetter: createCustomAcmeServiceGetter({
        async getBySslProvider() {
          return undefined;
        },
      }),
      user: { id: 1 },
      signal: undefined,
    };

    await assert.rejects(() => plugin.getAcmeClient(), /未找到颁发机构【not-exist】的配置/);
  });

  it("onSslProviderList 返回系统配置的全部颁发机构（内置 + 自定义）", async () => {
    const plugin: any = new CertApplyPlugin();
    plugin.ctx = {
      serviceGetter: createCustomAcmeServiceGetter({
        async getAll() {
          return [
            { sslProvider: "letsencrypt", title: "Let's Encrypt", directoryUrl: "", builtIn: true },
            { sslProvider: "google", title: "Google", directoryUrl: "", builtIn: true },
            { sslProvider: "letsencrypt_staging", title: "Let's Encrypt测试环境", directoryUrl: "", builtIn: true },
            { sslProvider: "myca", title: "我的CA", directoryUrl: "https://myca.example.com/directory", builtIn: false },
            { sslProvider: "myca2", title: "二号CA", directoryUrl: "https://myca2.example.com/directory", builtIn: false },
          ];
        },
      }),
    };

    const options = await plugin.onSslProviderList();

    const values = options.map((item: any) => item.value);
    assert.ok(values.includes("letsencrypt"));
    assert.ok(values.includes("google"));
    assert.ok(values.includes("letsencrypt_staging"));
    assert.ok(values.includes("myca"));
    assert.ok(values.includes("myca2"));
    // 旧版 custom 入口已隐藏
    assert.equal(values.includes("custom"), false);
  });

  it("颁发机构为空时 getAcmeClient 给出明确提示", async () => {
    const plugin: any = new CertApplyPlugin();
    plugin.version = 2;
    plugin.sslProvider = null;
    plugin.logger = { info() {}, warn() {}, error() {}, debug() {} };
    plugin.ctx = {
      serviceGetter: createCustomAcmeServiceGetter({}),
      user: { id: 1 },
      signal: undefined,
    };

    await assert.rejects(() => plugin.getAcmeClient(), /请先选择证书颁发机构/);
  });

  it("自定义颁发机构不支持 DNS 持久验证", async () => {
    const plugin: any = new CertApplyPlugin();
    plugin.version = 2;
    plugin.sslProvider = "myca";
    plugin.challengeType = "dns-persist";
    plugin.email = "user@example.com";
    plugin.logger = { info() {}, warn() {}, error() {}, debug() {} };
    plugin.userContext = {};
    plugin.ctx = {
      serviceGetter: createCustomAcmeServiceGetter({
        async getBySslProvider() {
          return { sslProvider: "myca", title: "我的CA", directoryUrl: "https://myca.example.com/directory", builtIn: false };
        },
      }),
      user: { id: 1 },
      signal: undefined,
    };

    await assert.rejects(() => plugin.doCertApply(), /DNS持久验证/);
  });
});
