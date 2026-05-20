import assert from "assert";
import { CertInfoWildcardDomainCountFix } from "./cert-info-wildcard-domain-count-fix.js";

describe("CertInfoWildcardDomainCountFix", () => {
  it("fixes cert info wildcard domain count only when value changed", async () => {
    const updated: any[] = [];
    const rows = [
      { id: 1, domains: "*.a.com,a.com, *.b.com ", wildcardDomainCount: 0 },
      { id: 2, domains: "c.com", wildcardDomainCount: 0 },
      { id: 3, domains: "*.d.com", wildcardDomainCount: 1 },
    ];
    const fix = new CertInfoWildcardDomainCountFix();
    fix.certInfoService = {
      countWildcardDomains(domains: string[]) {
        return domains.filter(item => item.trim().toLowerCase().startsWith("*.")).length;
      },
      async find() {
        return rows;
      },
      async update(value: any) {
        updated.push(value);
        const row = rows.find(item => item.id === value.id);
        Object.assign(row, value);
      },
    } as any;

    await fix.init();
    await fix.init();

    assert.deepEqual(updated, [
      {
        id: 1,
        wildcardDomainCount: 2,
      },
    ]);
  });
});
