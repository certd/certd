import assert from "node:assert/strict";
import { matchAllowedDomains } from "./cert-utils.js";

describe("matchAllowedDomains 允许域名语义（RFC 6125/9525）", () => {
  it(" plain后缀允许本域与全部子域", () => {
    matchAllowedDomains(["tianhao.me", "a.tianhao.me", "a.b.tianhao.me"], ["tianhao.me"]);
    assert.throws(() => matchAllowedDomains(["other.me"], ["tianhao.me"]), /不在该CA允许签发的范围内/);
  });
  it("顶级域后缀允许该后缀任意域名", () => {
    matchAllowedDomains(["foo.me", "bar.baz.me"], ["me"]);
    assert.throws(() => matchAllowedDomains(["foo.com"], ["me"]), /不在该CA允许签发的范围内/);
  });
  it("通配符仅单层子域，不含裸域与多级", () => {
    matchAllowedDomains(["a.tianhao.me", "*.tianhao.me"], ["*.tianhao.me"]);
    assert.throws(() => matchAllowedDomains(["tianhao.me"], ["*.tianhao.me"]), /不在该CA允许签发的范围内/);
    assert.throws(() => matchAllowedDomains(["a.b.tianhao.me"], ["*.tianhao.me"]), /不在该CA允许签发的范围内/);
  });
  it("IP仅精确匹配", () => {
    matchAllowedDomains(["1.2.3.4"], ["1.2.3.4"]);
    assert.throws(() => matchAllowedDomains(["1.2.3.5"], ["1.2.3.4"]), /不在该CA允许签发的范围内/);
  });
});
