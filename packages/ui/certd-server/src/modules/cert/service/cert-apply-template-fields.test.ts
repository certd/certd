import assert from "node:assert/strict";
import { pickCertApplyCustomParams, pickCertApplyTemplateParams } from "./cert-apply-template-fields.js";

describe("cert apply template fields", () => {
  it("keeps certificate apply and domain verify params but drops domains and verify plan for template", () => {
    const params = pickCertApplyTemplateParams({
      domains: ["example.com"],
      challengeType: "dns",
      dnsProviderType: "aliyun",
      dnsProviderAccess: 1,
      dnsProviderAccessType: "aliyun",
      domainsVerifyPlan: [{ domain: "example.com", type: "dns" }],
      sslProvider: "google",
      acmeAccountAccessId: 2,
      privateKeyType: "ec_256",
      pfxPassword: "secret",
      renewDays: 15,
      preferredChain: "GTS Root R1",
      newApplyParam: "kept",
    });

    assert.deepEqual(params, {
      challengeType: "dns",
      dnsProviderType: "aliyun",
      dnsProviderAccess: 1,
      dnsProviderAccessType: "aliyun",
      sslProvider: "google",
      acmeAccountAccessId: 2,
      privateKeyType: "ec_256",
      pfxPassword: "secret",
      renewDays: 15,
      preferredChain: "GTS Root R1",
      newApplyParam: "kept",
    });
  });

  it("keeps domain verify plan for custom auto apply params", () => {
    const params = pickCertApplyCustomParams({
      domains: ["example.com"],
      domainsVerifyPlan: [{ domain: "example.com", type: "dns" }],
      challengeType: "dns",
    });

    assert.deepEqual(params, {
      domainsVerifyPlan: [{ domain: "example.com", type: "dns" }],
      challengeType: "dns",
    });
  });
});
