import { isBlockedAddress } from "../../../src/plugins/plugin-cert/plugin/cert-plugin/local-ca/ssrf";

describe("local-ca SSRF address classification", () => {
  it("blocks IPv4 private/loopback/link-local/metadata", () => {
    for (const ip of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0"]) {
      expect(isBlockedAddress(ip)).toBe(true);
    }
  });
  it("allows public IPv4", () => {
    expect(isBlockedAddress("8.8.8.8")).toBe(false);
  });
  it("blocks IPv4-mapped IPv6 in hex and dotted form", () => {
    for (const ip of ["::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.1", "::ffff:a00:1", "[::ffff:169.254.169.254]"]) {
      expect(isBlockedAddress(ip)).toBe(true);
    }
  });
  it("blocks NAT64 and 6to4 embedded private IPv4", () => {
    expect(isBlockedAddress("64:ff9b::7f00:1")).toBe(true);
    expect(isBlockedAddress("2002:7f00:1::")).toBe(true);
  });
  it("blocks IPv6 loopback/ULA/link-local", () => {
    for (const ip of ["::1", "fc00::1", "fd12:3456::1", "fe80::1"]) {
      expect(isBlockedAddress(ip)).toBe(true);
    }
  });
  it("allows public IPv6 and public embedded", () => {
    expect(isBlockedAddress("2001:4860:4860::8888")).toBe(false);
    expect(isBlockedAddress("::ffff:8.8.8.8")).toBe(false);
  });
});
