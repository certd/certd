import assert from "node:assert/strict";
import { SysPrivateSettings, SysSafeSetting } from "./models.js";

describe("SysSafeSetting 安全检测开关", () => {  it("安全设置不再声明重复的 IP 黑名单和用户白名单", () => {
    const setting = new SysSafeSetting();
    assert.equal("ipBlacklist" in setting, false);
    assert.equal("userWhitelist" in setting, false);
  });

  it("URL 扫描和可疑流水线检测默认开启", () => {
    const setting: any = new SysSafeSetting();
    assert.equal(setting.urlScanEnabled, true);
    assert.equal(setting.suspiciousPipelineEnabled, true);
    assert.equal(SysSafeSetting.__key__, "sys.safe");
  });
});

describe("SysPrivateSettings 内置ACME颁发机构", () => {
  it("历史配置缺失内置项时自动补回，并保留自定义/本地CA条目", () => {
    const stored = [
      { sslProvider: "local-ca-2", title: "上海中间CA", directoryUrl: "https://ca.example.com/api/acme/5/directory", needEAB: true, builtIn: false, localCaId: 5 },
      { sslProvider: "google", title: "Google 自定义代理", directoryUrl: "", needEAB: true, builtIn: false, reverseProxy: "proxy.example.com" },
    ];
    const list = SysPrivateSettings.ensureBuiltInAcmeProviders(stored);
    const providers = list.map(item => item.sslProvider);
    assert.deepEqual(providers, ["letsencrypt", "google", "zerossl", "litessl", "sslcom", "letsencrypt_staging", "local-ca-2"]);
    const google = list.find(item => item.sslProvider === "google");
    assert.equal(google?.builtIn, true);
    assert.equal(google?.reverseProxy, "proxy.example.com");
    assert.equal(list.filter(item => item.sslProvider === "google").length, 1);
  });
});
