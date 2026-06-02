import assert from "node:assert/strict";
import { CertApplyTemplateService } from "./cert-apply-template-service.js";

function createService(list: any[]) {
  const service = new CertApplyTemplateService();
  (service as any).repository = {
    async findOne({ where }: any) {
      return list.find(item => {
        if (where.id != null && item.id !== where.id) {
          return false;
        }
        if (where.userId != null && item.userId !== where.userId) {
          return false;
        }
        if (where.projectId != null && item.projectId !== where.projectId) {
          return false;
        }
        if (where.isDefault != null && item.isDefault !== where.isDefault) {
          return false;
        }
        return true;
      });
    },
  };
  return service;
}

describe("CertApplyTemplateService", () => {
  it("does not apply default template when template id is not specified", async () => {
    const service = createService([
      {
        id: 1,
        userId: 10,
        projectId: 20,
        isDefault: true,
        content: JSON.stringify({
          sslProvider: "google",
          privateKeyType: "ec_256",
          renewDays: 10,
          domains: ["bad.example.com"],
          challengeType: "dns",
        }),
      },
    ]);

    const params = await service.resolveApplyParams({
      userId: 10,
      projectId: 20,
    });

    assert.deepEqual(params, {});
  });

  it("uses selected template when auto apply uses integer template id", async () => {
    const service = createService([
      {
        id: 2,
        userId: 10,
        projectId: 20,
        isDefault: false,
        content: JSON.stringify({
          sslProvider: "zerossl",
          acmeAccountAccessId: 8,
          preferredChain: "ZeroSSL RSA Domain Secure Site CA",
        }),
      },
    ]);

    const params = await service.resolveApplyParams({
      userId: 10,
      projectId: 20,
      templateId: 2,
    });

    assert.deepEqual(params, {
      sslProvider: "zerossl",
      acmeAccountAccessId: 8,
      preferredChain: "ZeroSSL RSA Domain Secure Site CA",
    });
  });

  it("uses custom params only when template id is not specified", async () => {
    const service = createService([
      {
        id: 1,
        userId: 10,
        projectId: 20,
        isDefault: true,
        content: JSON.stringify({
          sslProvider: "google",
          renewDays: 10,
        }),
      },
    ]);

    const params = await service.resolveApplyParams({
      userId: 10,
      projectId: 20,
      params: {
        renewDays: 30,
        privateKeyType: "rsa_4096",
        dnsProviderType: "cloudflare",
        domainsVerifyPlan: [{ domain: "example.com", type: "dns" }],
        domains: ["example.com"],
        challengeType: "auto",
      },
    });

    assert.deepEqual(params, {
      renewDays: 30,
      privateKeyType: "rsa_4096",
      dnsProviderType: "cloudflare",
      challengeType: "auto",
      domainsVerifyPlan: [{ domain: "example.com", type: "dns" }],
    });
  });

  it("merges selected template and custom params when both are specified", async () => {
    const service = createService([
      {
        id: 2,
        userId: 10,
        projectId: 20,
        isDefault: false,
        content: JSON.stringify({
          sslProvider: "zerossl",
          acmeAccountAccessId: 8,
          preferredChain: "ZeroSSL RSA Domain Secure Site CA",
          renewDays: 10,
        }),
      },
    ]);

    const params = await service.resolveApplyParams({
      userId: 10,
      projectId: 20,
      templateId: 2,
      params: {
        renewDays: 30,
        privateKeyType: "rsa_4096",
      },
    });

    assert.deepEqual(params, {
      sslProvider: "zerossl",
      acmeAccountAccessId: 8,
      preferredChain: "ZeroSSL RSA Domain Secure Site CA",
      renewDays: 30,
      privateKeyType: "rsa_4096",
    });
  });
});
