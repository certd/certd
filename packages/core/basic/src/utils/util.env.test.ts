/// <reference types="mocha" />

import { expect } from "chai";

import { isDev } from "./util.env.js";

describe("isDev", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv == null) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("treats missing NODE_ENV as development", () => {
    delete process.env.NODE_ENV;

    expect(isDev()).to.equal(true);
  });

  it("detects development-like NODE_ENV values", () => {
    process.env.NODE_ENV = "development";
    expect(isDev()).to.equal(true);

    process.env.NODE_ENV = "local";
    expect(isDev()).to.equal(true);

    process.env.NODE_ENV = "dev-test";
    expect(isDev()).to.equal(true);
  });

  it("rejects production-like NODE_ENV values", () => {
    process.env.NODE_ENV = "production";
    expect(isDev()).to.equal(false);

    process.env.NODE_ENV = "test";
    expect(isDev()).to.equal(false);
  });
});
