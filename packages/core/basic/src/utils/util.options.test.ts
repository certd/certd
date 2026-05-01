/// <reference types="mocha" />

import { expect } from "chai";

import { optionsUtils } from "./util.options.js";

describe("optionsUtils", () => {
  describe("groupByDomain", () => {
    it("splits options by domain match", () => {
      const matchedOption = { value: "matched", domain: "api.example.com" };
      const wildcardMatchedOption = { value: "wildcard", domain: "admin.example.com" };
      const unmatchedOption = { value: "unmatched", domain: "other.com" };

      const result = optionsUtils.groupByDomain([matchedOption, wildcardMatchedOption, unmatchedOption], ["api.example.com", "*.example.com"]);

      expect(result.matched).to.deep.equal([matchedOption, wildcardMatchedOption]);
      expect(result.notMatched).to.deep.equal([unmatchedOption]);
    });

    it("treats options without matching domains as not matched", () => {
      const optionWithoutDomain = { value: "empty" };

      const result = optionsUtils.groupByDomain([optionWithoutDomain], ["example.com"]);

      expect(result.matched).to.deep.equal([]);
      expect(result.notMatched).to.deep.equal([optionWithoutDomain]);
    });
  });

  describe("buildGroupOptions", () => {
    it("builds disabled group labels around matched and unmatched options", () => {
      const matchedOption = { value: "matched", domain: "api.example.com" };
      const unmatchedOption = { value: "unmatched", domain: "other.com" };

      const result = optionsUtils.buildGroupOptions([matchedOption, unmatchedOption], ["api.example.com"]);

      expect(result).to.deep.equal([{ value: "matched", disabled: true, label: "----已匹配----" }, matchedOption, { value: "unmatched", disabled: true, label: "----未匹配----" }, unmatchedOption]);
    });
  });
});
