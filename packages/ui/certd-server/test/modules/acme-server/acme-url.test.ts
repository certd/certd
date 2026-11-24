import { isSameAcmeUrl } from "../../../src/modules/acme-server/protocol/acme-url";

describe("isSameAcmeUrl full-URL trusted matching", () => {
  it("matches identical directory URL", () => {
    expect(isSameAcmeUrl("https://acme.example.com/acme/directory", "https://acme.example.com/acme/directory")).toBe(true);
  });
  it("ignores trailing slash and default port", () => {
    expect(isSameAcmeUrl("https://acme.example.com:443/acme/directory/", "https://acme.example.com/acme/directory")).toBe(true);
  });
  it("rejects different path on same origin", () => {
    expect(isSameAcmeUrl("https://acme.example.com/another/path", "https://acme.example.com/acme/directory")).toBe(false);
  });
  it("rejects different origin", () => {
    expect(isSameAcmeUrl("https://evil.example.com/acme/directory", "https://acme.example.com/acme/directory")).toBe(false);
  });
  it("rejects different query", () => {
    expect(isSameAcmeUrl("https://acme.example.com/acme/directory?x=1", "https://acme.example.com/acme/directory")).toBe(false);
  });
  it("rejects userinfo and fragment", () => {
    expect(isSameAcmeUrl("https://user:password@acme.example.com/acme/directory", "https://acme.example.com/acme/directory")).toBe(false);
    expect(isSameAcmeUrl("https://acme.example.com/acme/directory#fragment", "https://acme.example.com/acme/directory")).toBe(false);
  });
});
