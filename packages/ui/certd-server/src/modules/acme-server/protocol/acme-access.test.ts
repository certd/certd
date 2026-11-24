import assert from "node:assert/strict";
import { isValidIpRule, matchesIpRule, matchIpAllowlist, normalizeIpAllowlist, normalizeRequiredHeaders } from "./acme-access.js";

describe("acme-access IP/CIDR matching", () => {
  it("validates rules", () => {
    assert.equal(isValidIpRule("127.0.0.1"), true);
    assert.equal(isValidIpRule("10.0.0.0/8"), true);
    assert.equal(isValidIpRule("192.168.*.*"), true);
    assert.equal(isValidIpRule("2001:db8::/32"), true);
    assert.equal(isValidIpRule("::1"), true);
    assert.equal(isValidIpRule("10.0.0.0/33"), false);
    assert.equal(isValidIpRule("999.1.1.1"), false);
    assert.equal(isValidIpRule("abc"), false);
    assert.equal(isValidIpRule(""), false);
  });
  it("matches exact IPv4/IPv6", () => {
    assert.equal(matchesIpRule("127.0.0.1", "127.0.0.1"), true);
    assert.equal(matchesIpRule("127.0.0.2", "127.0.0.1"), false);
    assert.equal(matchesIpRule("::1", "::1"), true);
  });
  it("matches CIDR", () => {
    assert.equal(matchesIpRule("10.1.2.3", "10.0.0.0/8"), true);
    assert.equal(matchesIpRule("11.1.2.3", "10.0.0.0/8"), false);
    assert.equal(matchesIpRule("192.168.1.5", "192.168.1.0/24"), true);
    assert.equal(matchesIpRule("192.168.2.5", "192.168.1.0/24"), false);
    assert.equal(matchesIpRule("2001:db8::1", "2001:db8::/32"), true);
    assert.equal(matchesIpRule("2001:db9::1", "2001:db8::/32"), false);
    assert.equal(matchesIpRule("8.8.8.8", "0.0.0.0/0"), true);
  });
  it("matches wildcard octets", () => {
    assert.equal(matchesIpRule("192.168.1.5", "192.168.*.*"), true);
    assert.equal(matchesIpRule("192.169.1.5", "192.168.*.*"), false);
  });
  it("normalizes IPv4-mapped IPv6", () => {
    assert.equal(matchesIpRule("::ffff:127.0.0.1", "127.0.0.1"), true);
    assert.equal(matchesIpRule("::ffff:10.1.2.3", "10.0.0.0/8"), true);
  });
  it("allowlist empty allows all", () => {
    assert.equal(matchIpAllowlist("8.8.8.8", []), true);
    assert.equal(matchIpAllowlist("8.8.8.8", ["10.0.0.0/8"]), false);
    assert.equal(matchIpAllowlist("10.1.1.1", ["10.0.0.0/8", "127.0.0.1"]), true);
  });
  it("normalizeIpAllowlist validates and dedups", () => {
    assert.deepEqual(normalizeIpAllowlist(["10.0.0.0/8", " 10.0.0.0/8 ", "127.0.0.1"]), ["10.0.0.0/8", "127.0.0.1"]);
    assert.throws(() => normalizeIpAllowlist(["999.1.1.1"]), /不合法/);
    assert.throws(() => normalizeIpAllowlist(Array(51).fill("10.0.0.1")), /最多/);
  });
  it("normalizeRequiredHeaders validates names", () => {
    assert.deepEqual(normalizeRequiredHeaders([{ name: "X-ACME-AUTH", value: "certd" }]), [{ name: "X-ACME-AUTH", value: "certd" }]);
    assert.throws(() => normalizeRequiredHeaders([{ name: "bad header", value: "x" }]), /不合法/);
    assert.throws(() => normalizeRequiredHeaders("nope" as any), /必须是数组/);
  });
});