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
      },
    } as any;
    autoFix.oauthSubtypeBoundTypeFix = {
      async init() {
        calls.push("oauth");
      },
    } as any;
    autoFix.certInfoWildcardDomainCountFix = {
      async init() {
        calls.push("cert");
      },
    } as any;
    autoFix.suiteContentWildcardDomainCountFix = {
      async init() {
        calls.push("suite");
      },
    } as any;

    await autoFix.init();

    assert.deepEqual(calls, ["google", "cert", "suite", "oauth"]);
    assert.equal(savedSetting.fixed["google-common-eab-account-key"], true);
    assert.equal(savedSetting.fixed["oauth-subtype-bound-type"], true);
    assert.equal(savedSetting.fixed["cert-info-wildcard-domain-count"], true);
    assert.equal(savedSetting.fixed["suite-content-wildcard-domain-count"], true);
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

    await autoFix.init();
  });
});
