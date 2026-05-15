import assert from "assert";
import { AutoFix } from "./auto-fix.js";

describe("AutoFix", () => {
  it("runs fix tasks in order", async () => {
    const calls: string[] = [];
    const autoFix = new AutoFix();
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

    assert.deepEqual(calls, ["google", "oauth", "cert", "suite"]);
  });
});
