/// <reference types="mocha" />

import { expect } from "chai";

import { stringUtils } from "./util.string.js";

describe("stringUtils", () => {
  describe("maxLength", () => {
    it("returns an empty string for empty input", () => {
      expect(stringUtils.maxLength()).to.equal("");
      expect(stringUtils.maxLength("")).to.equal("");
    });

    it("returns the original string when it is within the limit", () => {
      expect(stringUtils.maxLength("certd", 5)).to.equal("certd");
      expect(stringUtils.maxLength("certd", 6)).to.equal("certd");
    });

    it("truncates strings longer than the limit and appends ellipsis", () => {
      expect(stringUtils.maxLength("certificate", 4)).to.equal("cert...");
    });
  });

  describe("appendTimeSuffix", () => {
    it("returns an empty string for empty input", () => {
      expect(stringUtils.appendTimeSuffix()).to.equal("");
      expect(stringUtils.appendTimeSuffix("")).to.equal("");
    });

    it("appends a millisecond timestamp suffix", () => {
      const result = stringUtils.appendTimeSuffix("certd");

      expect(result).to.match(/^certd-\d{17}$/);
    });
  });
});
