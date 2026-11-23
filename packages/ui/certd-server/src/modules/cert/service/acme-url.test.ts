import assert from "node:assert/strict";
import { isSameAcmeUrl } from "./acme-url.js";

describe("ACME URL validation", () => {
  const expected = "https://ca.example.com:8443/api/acme/2/new-order";
  it("完整 scheme/host/port/path 一致才通过", () => {
    assert.equal(isSameAcmeUrl(expected, expected), true);
    assert.equal(isSameAcmeUrl("https://ca.example.com:8443/api/acme/2/new-order?x=1", expected), false);
    assert.equal(isSameAcmeUrl("https://ca.example.com/api/acme/2/new-order", expected), false);
    assert.equal(isSameAcmeUrl("http://ca.example.com:8443/api/acme/2/new-order", expected), false);
    assert.equal(isSameAcmeUrl("https://evil.example.com:8443/api/acme/2/new-order", expected), false);
    assert.equal(isSameAcmeUrl("https://ca.example.com:9443/api/acme/2/new-order", expected), false);
    assert.equal(isSameAcmeUrl("https://ca.example.com:8443/api/acme/2/finalize/1", expected), false);
    assert.equal(isSameAcmeUrl("not-a-url", expected), false);
  });
});
