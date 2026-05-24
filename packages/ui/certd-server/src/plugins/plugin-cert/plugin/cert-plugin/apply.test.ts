import assert from "assert";
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
