import assert from "assert";
import { fixSuiteContentWildcardDomainCount, SuiteContentWildcardDomainCountFix } from "./suite-content-wildcard-domain-count-fix.js";

describe("SuiteContentWildcardDomainCountFix", () => {
  it("fills missing suite wildcard domain count from total domain count", () => {
    const fixed = fixSuiteContentWildcardDomainCount(
      JSON.stringify({
        maxDomainCount: 10,
      })
    );

    assert.equal(JSON.parse(fixed).maxWildcardDomainCount, 10);
    assert.equal(
      JSON.parse(
        fixSuiteContentWildcardDomainCount(
          JSON.stringify({
            maxDomainCount: -1,
          })
        )
      ).maxWildcardDomainCount,
      -1
    );
    assert.equal(
      fixSuiteContentWildcardDomainCount(
        JSON.stringify({
          maxDomainCount: 10,
          maxWildcardDomainCount: 3,
        })
      ),
      null
    );
  });

  it("fixes suite content wildcard domain count in product and user suite tables", async () => {
    const rows = {
      cd_product: [
        { id: 1, content: JSON.stringify({ maxDomainCount: 1 }) },
        { id: 2, content: JSON.stringify({ maxDomainCount: 1, maxWildcardDomainCount: 0 }) },
      ],
      cd_user_suite: [{ id: 3, content: JSON.stringify({ maxDomainCount: 2 }) }],
    };
    const updates: any[] = [];
    const entityManager = {
      async query(sql: string) {
        const table = sql.includes("cd_product") ? "cd_product" : "cd_user_suite";
        return rows[table];
      },
      async update(tableName: string, where: any, value: any) {
        updates.push({ tableName, where, value });
        const row = rows[tableName].find((item: any) => item.id === where.id);
        Object.assign(row, value);
      },
    };
    const fix = new SuiteContentWildcardDomainCountFix();
    fix.dataSourceManager = {
      getDataSource() {
        return {
          manager: entityManager,
        };
      },
    } as any;

    await fix.init();
    await fix.init();

    assert.equal(updates.length, 2);
    assert.equal(updates[0].tableName, "cd_product");
    assert.equal(JSON.parse(updates[0].value.content).maxWildcardDomainCount, 1);
    assert.equal(updates[1].tableName, "cd_user_suite");
    assert.equal(JSON.parse(updates[1].value.content).maxWildcardDomainCount, 2);
  });
});
