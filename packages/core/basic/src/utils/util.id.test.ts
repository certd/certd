/// <reference types="mocha" />

import { expect } from "chai";

import { randomNumber, simpleNanoId } from "./util.id.js";

describe("id utils", () => {
  it("generates a four digit random number string", () => {
    expect(randomNumber()).to.match(/^\d{4}$/);
  });

  it("generates a twelve character simple nano id", () => {
    const id = simpleNanoId();

    expect(id).to.have.length(12);
    expect(id).to.match(/^[0-9a-zA-Z]+$/);
  });
});
