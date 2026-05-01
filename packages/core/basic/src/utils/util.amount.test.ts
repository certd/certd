/// <reference types="mocha" />

import { expect } from "chai";

import { amountUtils } from "./util.amount.js";

describe("amountUtils", () => {
  describe("toCent", () => {
    it("converts yuan values to cents", () => {
      expect(amountUtils.toCent(1)).to.equal(100);
      expect(amountUtils.toCent(12.34)).to.equal(1234);
    });

    it("rounds to the nearest cent", () => {
      expect(amountUtils.toCent(1.235)).to.equal(124);
      expect(amountUtils.toCent(1.234)).to.equal(123);
    });
  });

  describe("toYuan", () => {
    it("converts cent values to yuan", () => {
      expect(amountUtils.toYuan(100)).to.equal(1);
      expect(amountUtils.toYuan(1234)).to.equal(12.34);
    });

    it("rounds yuan values to two decimal places", () => {
      expect(amountUtils.toYuan(1235)).to.equal(12.35);
      expect(amountUtils.toYuan(1)).to.equal(0.01);
    });
  });
});
