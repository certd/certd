import assert from "node:assert/strict";
import { BuiltinAcmeProviderFix } from "./builtin-acme-provider-fix.js";
import { SysPrivateSettings } from "@certd/lib-server";

describe("BuiltinAcmeProviderFix", () => {
  it("缺失内置项时补齐并保存", async () => {
    const fix = new BuiltinAcmeProviderFix();
    const local = { sslProvider: "local-ca-2", title: "本地CA", localCaId: 2, directoryUrl: "https://ca.example.com/api/acme/5/directory", builtIn: false };
    let saved: any;
    fix.sysSettingsService = {
      async getPrivateSettings() {
        return { customAcmeProviders: [local] };
      },
      async savePrivateSettings(settings: any) {
        saved = settings;
      },
    } as any;
    assert.equal(await fix.init(), true);
    const providers = saved.customAcmeProviders.map((item: any) => item.sslProvider);
    assert.deepEqual(providers.slice(0, 6), ["letsencrypt", "google", "zerossl", "litessl", "sslcom", "letsencrypt_staging"]);
    assert.equal(providers[6], "local-ca-2");
  });

  it("内置项完整时不重复写入", async () => {
    const fix = new BuiltinAcmeProviderFix();
    let saved = false;
    fix.sysSettingsService = {
      async getPrivateSettings() {
        return { customAcmeProviders: [...(new SysPrivateSettings().customAcmeProviders || [])] };
      },
      async savePrivateSettings() {
        saved = true;
      },
    } as any;
    await fix.init();
    assert.equal(saved, false);
  });
});
