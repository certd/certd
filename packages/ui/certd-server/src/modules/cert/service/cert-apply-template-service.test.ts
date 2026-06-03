import assert from "node:assert/strict";
import { CertApplyTemplateService } from "./cert-apply-template-service.js";

function createService(list: any[]) {
  const service = new CertApplyTemplateService();
  const updateWhereList: any[] = [];
  function matchesWhere(item: any, where: any) {
    for (const key of Object.keys(where)) {
      const expected = where[key];
      if (expected?._type === "isNull") {
        if (item[key] != null) {
          return false;
        }
        continue;
      }
      if (expected != null && item[key] !== expected) {
        return false;
      }
    }
    return true;
  }
  (service as any).repository = {
    async findOne({ where }: any) {
      return list.find(item => matchesWhere(item, where));
    },
    async update(where: any, patch: any) {
      updateWhereList.push({ ...where });
      for (const item of list) {
        if (matchesWhere(item, where)) {
          Object.assign(item, patch);
        }
      }
    },
  };
  (service as any).updateWhereList = updateWhereList;
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

  it("does not include project id condition when setting default without project id", async () => {
    const list = [
      {
        id: 1,
        userId: 10,
        projectId: null,
        isDefault: true,
        disabled: false,
        content: "{}",
      },
      {
        id: 2,
        userId: 10,
        projectId: null,
        isDefault: false,
        disabled: false,
        content: "{}",
      },
      {
        id: 3,
        userId: 10,
        projectId: 20,
        isDefault: true,
        disabled: false,
        content: "{}",
      },
    ];
    const service = createService(list);

    await service.setDefault(2, 10, null);

    assert.deepEqual((service as any).updateWhereList, [
      { userId: 10 },
      { userId: 10, id: 2 },
    ]);
    assert.equal(list[0].isDefault, false);
    assert.equal(list[1].isDefault, true);
    assert.equal(list[2].isDefault, false);
  });
});
