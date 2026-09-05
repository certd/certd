import assert from "assert";
import { ReverseProxyMigrateFix } from "./reverse-proxy-migrate-fix.js";

describe("ReverseProxyMigrateFix", () => {
  function createFix(opts: { reverseProxies?: Record<string, string>; providers?: any[] }) {
    const fix = new ReverseProxyMigrateFix();
    let saved: any = null;
    fix.sysSettingsService = {
      async getPrivateSettings() {
        return {
          reverseProxies: opts.reverseProxies || {},
          customAcmeProviders: opts.providers || [
            { sslProvider: "letsencrypt", title: "Let's Encrypt", directoryUrl: "", builtIn: true },
            { sslProvider: "google", title: "Google", directoryUrl: "", builtIn: true },
          ],
        };
      },
      async savePrivateSettings(setting: any) {
        saved = setting;
      },
    } as any;
    return { fix, getSaved: () => saved };
  }

  it("把旧网络设置中的反代迁移到内置颁发机构的 reverseProxy，并清理旧字段", async () => {
    const { fix, getSaved } = createFix({
      reverseProxies: {
        "acme-v02.api.letsencrypt.org": "le-proxy.example.com",
        "dv.acme-v02.api.pki.goog": "gg-proxy.example.com",
      },
    });

    const ret = await fix.init();

    assert.equal(ret, true);
    const saved = getSaved();
    assert.equal(saved.customAcmeProviders[0].reverseProxy, "le-proxy.example.com");
    assert.equal(saved.customAcmeProviders[1].reverseProxy, "gg-proxy.example.com");
    // 旧字段已清理
    assert.equal(saved.reverseProxies, undefined);
  });

  it("已配置 reverseProxy 的内置项不被覆盖（不触发保存）", async () => {
    const { fix, getSaved } = createFix({
      reverseProxies: {
        "acme-v02.api.letsencrypt.org": "le-proxy.example.com",
      },
      providers: [{ sslProvider: "letsencrypt", title: "Let's Encrypt", directoryUrl: "", reverseProxy: "custom-proxy.example.com", builtIn: true }],
    });

    const ret = await fix.init();

    assert.equal(ret, true);
    // 没有变化，不保存（原 reverseProxy 保留）
    assert.equal(getSaved(), null);
  });

  it("无旧反代配置时直接返回，不保存", async () => {
    const { fix, getSaved } = createFix({
      reverseProxies: {
        "acme-v02.api.letsencrypt.org": "",
        "dv.acme-v02.api.pki.goog": "",
      },
    });

    const ret = await fix.init();

    assert.equal(ret, true);
    assert.equal(getSaved(), null);
  });

  it("未知域名不迁移（不触发保存）", async () => {
    const { fix, getSaved } = createFix({
      reverseProxies: {
        "unknown.ca.example.com": "proxy.example.com",
      },
    });

    await fix.init();

    assert.equal(getSaved(), null);
  });
});
