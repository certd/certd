import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { SubDomainsGetter } from "./sub-domain-getter.js";

describe("SubDomainsGetter", () => {
  it("returns subdomains configured on system cname providers", async () => {
    const subDomainService = {
      async getListByUserId() {
        return ["example.com"];
      },
    } as any;
    const domainService = {
      async findOne() {
        return null;
      },
    } as any;
    const cnameProviderService = {
      async getSubDomains() {
        return ["cname-hosted.example.com"];
      },
    } as any;

    const getter = new SubDomainsGetter(1, 2, subDomainService, domainService, cnameProviderService);

    assert.deepEqual(await getter.getSubDomains(), ["cname-hosted.example.com", "example.com"]);
    assert.equal(await getter.hasSubDomain("txt.certd.cname-hosted.example.com"), "cname-hosted.example.com");
  });
});
