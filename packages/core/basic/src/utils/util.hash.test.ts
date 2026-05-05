/// <reference types="mocha" />

import { expect } from "chai";

import { hashUtils } from "./util.hash.js";

describe("hashUtils", () => {
  describe("digest helpers", () => {
    it("generates md5 and sha256 hex digests by default", () => {
      expect(hashUtils.md5("certd")).to.equal("3f3d9f715fcc63d54a4a224e0939a233");
      expect(hashUtils.sha256("certd")).to.equal("26a6366060d2a6477185c05075155769cb438c6c71f61f509535b8516594ad92");
    });

    it("supports alternate digest encodings", () => {
      expect(hashUtils.md5("certd", "base64")).to.equal("Pz2fcV/MY9VKSiJOCTmiMw==");
      expect(hashUtils.sha256("certd", "base64")).to.equal("JqY2YGDSpkdxhcBQdRVXactDjGxx9h9QlTW4UWWUrZI=");
    });
  });

  describe("hmac helpers", () => {
    it("signs data with a provided key", () => {
      expect(hashUtils.hmacSha256WithKey("secret", "certd")).to.equal("kh/kUD/Ji8FHfpt4vYUHZx+1BZvKSyyklZIiuS+Rzlg=");
    });

    it("uses an empty payload when only the key is provided", () => {
      expect(hashUtils.hmacSha256("secret")).to.equal("+eZuF5tnR65UEI+C+K3os8Jddv0wr95sOVgixTAZYWk=");
    });
  });

  describe("encoding helpers", () => {
    it("round trips base64 values", () => {
      const encoded = hashUtils.base64("证书-certd");

      expect(encoded).to.equal("6K+B5LmmLWNlcnRk");
      expect(hashUtils.base64Decode(encoded)).to.equal("证书-certd");
    });

    it("converts strings and numbers to hex", () => {
      expect(hashUtils.toHex("certd")).to.equal("6365727464");
      expect(hashUtils.hexToStr("6365727464")).to.equal("certd");
      expect(hashUtils.toHex(255)).to.equal("ff");
      expect(hashUtils.hexToNumber("ff")).to.equal(255);
    });
  });
});
