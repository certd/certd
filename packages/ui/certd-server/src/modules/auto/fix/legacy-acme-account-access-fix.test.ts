import assert from "assert";
import { buildAcmeAccountAccessName, buildAcmeAccountSetting, maskAcmeAccountEmail, parseLegacyAcmeStorageKey } from "./legacy-acme-account-access-fix.js";

describe("LegacyAcmeAccountAccessFix", () => {
  it("parses legacy storage account key", () => {
    assert.deepEqual(parseLegacyAcmeStorageKey("acme.config.letsencrypt.user@example.com"), {
      caType: "letsencrypt",
      email: "user@example.com",
    });
  });

  it("skips EAB access cache keys", () => {
    assert.equal(parseLegacyAcmeStorageKey("acme.config.google.access.12"), null);
  });

  it("builds acme account access setting from legacy config", () => {
    const setting = buildAcmeAccountSetting({
      caType: "letsencrypt",
      email: "user@example.com",
      config: {
        key: "private-key",
        accountUrl: "https://example.com/acct/1",
      },
    });

    assert.equal(setting.caType, "letsencrypt");
    const account = JSON.parse(setting.account);
    assert.equal(account.accountKey, "private-key");
    assert.equal(account.accountUri, "https://example.com/acct/1");
  });

  it("builds masked acme account access name", () => {
    assert.equal(maskAcmeAccountEmail("xiaojunnuo@qq.com"), "xi*******qq.com");
    assert.equal(buildAcmeAccountAccessName("zerossl", "xiaojunnuo@qq.com"), "zerossl-acme-xi*******qq.com");
  });

  it("skips incomplete legacy config", () => {
    const setting = buildAcmeAccountSetting({
      caType: "letsencrypt",
      email: "user@example.com",
      config: {
        key: "private-key",
      },
    });

    assert.equal(setting, null);
  });
});
