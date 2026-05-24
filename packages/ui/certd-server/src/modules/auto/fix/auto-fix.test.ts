import assert from "assert";
import { AutoFix } from "./auto-fix.js";

describe("AutoFix", () => {
  it("runs unfinished fix tasks in order and marks them fixed", async () => {
    const calls: string[] = [];
    let savedSetting: any;
    const autoFix = new AutoFix();
    autoFix.sysSettingsService = {
      async getSetting() {
        return {
          fixed: {
            "oauth-subtype-bound-type": true,
          },
        };
      },
      async saveSetting(setting: any) {
        savedSetting = {
          fixed: { ...setting.fixed },
        };
      },
    } as any;
    autoFix.googleCommonEabAccountKeyFix = {
      async init() {
        calls.push("google");
        return true;
      },
    } as any;
    autoFix.oauthSubtypeBoundTypeFix = {
      async init() {
        calls.push("oauth");
        return true;
      },
    } as any;
    autoFix.certInfoWildcardDomainCountFix = {
      async init() {
        calls.push("cert");
        return true;
      },
    } as any;
    autoFix.suiteContentWildcardDomainCountFix = {
      async init() {
        calls.push("suite");
        return true;
      },
    } as any;
    autoFix.legacyAcmeAccountAccessFix = {
      async init() {
        calls.push("legacy-acme");
        return true;
      },
    } as any;
    autoFix.commonEabToAcmeAccountFix = {
      async init() {
        calls.push("common-eab-acme");
        return true;
      },
    } as any;

    await autoFix.init();

    assert.deepEqual(calls, ["google", "cert", "suite", "legacy-acme", "common-eab-acme"]);
    assert.equal(savedSetting.fixed["google-common-eab-account-key"], true);
    assert.equal(savedSetting.fixed["oauth-subtype-bound-type"], true);
    assert.equal(savedSetting.fixed["cert-info-wildcard-domain-count"], true);
    assert.equal(savedSetting.fixed["suite-content-wildcard-domain-count"], true);
    assert.equal(savedSetting.fixed["legacy-acme-account-access"], true);
    assert.equal(savedSetting.fixed["common-eab-to-acme-account"], true);
  });

  it("initializes missing fixed map", async () => {
    const autoFix = new AutoFix();
    autoFix.sysSettingsService = {
      async getSetting() {
        return {};
      },
      async saveSetting() {},
    } as any;
    autoFix.googleCommonEabAccountKeyFix = { async init() {} } as any;
    autoFix.oauthSubtypeBoundTypeFix = { async init() {} } as any;
    autoFix.certInfoWildcardDomainCountFix = { async init() {} } as any;
    autoFix.suiteContentWildcardDomainCountFix = { async init() {} } as any;
    autoFix.legacyAcmeAccountAccessFix = { async init() {} } as any;
    autoFix.commonEabToAcmeAccountFix = { async init() {} } as any;

    await autoFix.init();
  });
});
