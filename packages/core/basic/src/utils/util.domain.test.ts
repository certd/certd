/// <reference types="mocha" />

import { expect } from "chai";

import { domainUtils } from "./util.domain.js";

describe("domainUtils", () => {
  describe("match", () => {
    it("matches exact domains", () => {
      expect(domainUtils.match("example.com", ["example.com"])).to.equal(true);
      expect(domainUtils.match("api.example.com", ["example.com"])).to.equal(false);
    });

    it("matches wildcard domains by suffix", () => {
      expect(domainUtils.match("api.example.com", ["*.example.com"])).to.equal(true);
      expect(domainUtils.match("deep.api.example.com", ["*.example.com"])).to.equal(false);
      expect(domainUtils.match("example.com", ["*.example.com"])).to.equal(false);
    });

    it("requires every target domain to match", () => {
      expect(domainUtils.match(["api.example.com", "admin.example.com"], ["*.example.com"])).to.equal(true);
      expect(domainUtils.match(["api.example.com", "other.com"], ["*.example.com"])).to.equal(false);
    });
  });

  describe("isIp", () => {
    it("detects valid IPv4 addresses", () => {
      expect(domainUtils.isIpv4("127.0.0.1")).to.equal(true);
      expect(domainUtils.isIpv4("255.255.255.255")).to.equal(true);
    });

    it("rejects invalid IPv4 addresses", () => {
      expect(domainUtils.isIpv4("999.1.1.1")).to.equal(false);
      expect(domainUtils.isIpv4("1.2.3")).to.equal(false);
      expect(domainUtils.isIpv4("example.com")).to.equal(false);
    });

    it("detects IPv6 addresses", () => {
      expect(domainUtils.isIpv6("2001:db8::1")).to.equal(true);
      expect(domainUtils.isIp("2001:db8::1")).to.equal(true);
    });
  });
});
