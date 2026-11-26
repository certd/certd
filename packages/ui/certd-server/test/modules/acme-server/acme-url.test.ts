import assert from "node:assert/strict";
import { isSameAcmeUrl } from "../../../src/modules/acme-server/protocol/acme-url.js";

describe("isSameAcmeUrl full-URL trusted matching", () => {
  it("matches identical directory URL", () => {
    assert.equal(isSameAcmeUrl("https://acme.example.com/acme/directory", "https://acme.example.com/acme/directory"), true);
  });
  it("ignores trailing slash and default port", () => {
    assert.equal(isSameAcmeUrl("https://acme.example.com:443/acme/directory/", "https://acme.example.com/acme/directory"), true);
  });
  it("rejects different path on same origin", () => {
    assert.equal(isSameAcmeUrl("https://acme.example.com/another/path", "https://acme.example.com/acme/directory"), false);
  });
  it("rejects different origin", () => {
    assert.equal(isSameAcmeUrl("https://evil.example.com/acme/directory", "https://acme.example.com/acme/directory"), false);
  });
  it("rejects different query", () => {
    assert.equal(isSameAcmeUrl("https://acme.example.com/acme/directory?x=1", "https://acme.example.com/acme/directory"), false);
  });
  it("rejects userinfo and fragment", () => {
    assert.equal(isSameAcmeUrl("https://user:password@acme.example.com/acme/directory", "https://acme.example.com/acme/directory"), false);
    assert.equal(isSameAcmeUrl("https://acme.example.com/acme/directory#fragment", "https://acme.example.com/acme/directory"), false);
  });
});
