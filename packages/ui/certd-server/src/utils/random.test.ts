/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";

import { RandomUtil } from "./random.js";

describe("RandomUtil.randomStr", () => {
  it("generates an 8-character alphanumeric string by default", () => {
    const result = RandomUtil.randomStr();

    assert.equal(result.length, 8);
    assert.match(result, /^[A-Za-z0-9]+$/);
  });

  it("uses the requested length", () => {
    assert.equal(RandomUtil.randomStr(0), "");
    assert.equal(RandomUtil.randomStr(1).length, 1);
    assert.equal(RandomUtil.randomStr(16).length, 16);
  });

  it("supports a custom character set", () => {
    assert.equal(RandomUtil.randomStr(6, "A"), "AAAAAA");
  });

  it("supports the legacy true option as alphanumeric mode", () => {
    const result = RandomUtil.randomStr(32, true);

    assert.match(result, /^[A-Za-z0-9]+$/);
  });

  it("can generate from numbers only", () => {
    const result = RandomUtil.randomStr(12, { letters: false });

    assert.match(result, /^[0-9]+$/);
  });

  it("can generate from caller-provided option character sets", () => {
    assert.equal(RandomUtil.randomStr(4, { numbers: "7", letters: false }), "7777");
    assert.equal(RandomUtil.randomStr(4, { numbers: false, letters: "x" }), "xxxx");
    assert.equal(RandomUtil.randomStr(4, { numbers: false, letters: false, specials: "!" }), "!!!!");
  });

  it("can generate from built-in specials only", () => {
    const result = RandomUtil.randomStr(20, { numbers: false, letters: false, specials: true });

    assert.match(result, /^[~!@#$%^*()_+\-=[\]{}|;:,./<>?]+$/);
  });

  it("rejects an empty character set", () => {
    assert.throws(() => RandomUtil.randomStr(4, ""), /at least one available character/);
    assert.throws(() => RandomUtil.randomStr(4, { numbers: false, letters: false }), /at least one available character/);
  });
});
