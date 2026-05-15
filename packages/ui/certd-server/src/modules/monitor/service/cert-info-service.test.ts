import assert from "assert";
import { CertInfoService } from "./cert-info-service.js";

describe("CertInfoService", () => {
  it("counts wildcard domains by normalized prefix", () => {
    const service = new CertInfoService();

    assert.equal(service.countWildcardDomains(["*.a.com", "a.com", " *.B.com "]), 2);
  });

  it("saves wildcard domain count when updating pipeline domains", async () => {
    const service = new CertInfoService();
    let saved: any;
    service.repository = {
      async findOne() {
        return null;
      },
    } as any;
    service.addOrUpdate = async (bean: any) => {
      saved = bean;
      return bean;
    };

    await service.updateDomains(1, 2, null, ["*.a.com", "a.com", "*.b.com"], "pipeline");

    assert.equal(saved.domainCount, 3);
    assert.equal(saved.wildcardDomainCount, 2);
  });
});
