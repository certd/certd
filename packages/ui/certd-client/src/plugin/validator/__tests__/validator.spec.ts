import { describe, expect, it } from "vitest";
import { isDomain, isFilePath } from "/@/plugin/validator";

describe("domain_validator", () => {
  it("ok", () => {
    const value = ["a.cc.com", "*.zz.com", "a.cc.com"];
    const v = isDomain({}, value);
    expect(v).to.be.true;
  });

  it("allowDotStart", () => {
    let value = ["&.cc.com"];
    function test() {
      return isDomain({ allowDotStart: true }, value);
    }
    expect(test).to.throw(Error, "Invalid domain: &.cc.com. Enter a valid domain");

    value = ["a,cc.com"];
    expect(test).to.throw(Error, "Invalid domain: a. Enter a valid domain");

    value = ["&cc.com"];
    expect(test).to.throw(Error, "Invalid domain: &cc.com. Enter a valid domain");

    value = [".cc.com"];
    expect(test()).to.be.true;
  });

  it("default", () => {
    let value = ["&.cc.com"];
    function test() {
      return isDomain({ allowDotStart: false }, value);
    }
    expect(test).to.throw(Error, "Invalid domain: &.cc.com. Enter a valid domain");

    value = ["&cc.com"];
    expect(test).to.throw(Error, "Invalid domain: &cc.com. Enter a valid domain");

    value = ["a,cc.com"];
    expect(test).to.throw(Error, "Invalid domain: a. Enter a valid domain");

    value = [".cc.com"];
    expect(test).to.throw(Error, "Invalid domain: .cc.com. Enter a valid domain");
  });

  it("isFilePath", () => {
    let value = "/a/$/bc";

    function test() {
      return isFilePath({}, value);
    }

    expect(test()).to.be.true;

    value = "/a/&/bc";
    expect(test()).to.be.true;

    //*?“<>|等特殊字符

    value = "/a/&/b>c.txt";
    const errorMessage = 'File names cannot contain special characters such as *?"<>|';
    expect(test).to.throw(Error, errorMessage);

    value = "/a/&/b<c.txt";
    expect(test).to.throw(Error, errorMessage);

    value = "/a/&/b|c.txt";
    expect(test).to.throw(Error, errorMessage);

    value = "/a/&/b?c.txt";
    expect(test).to.throw(Error, errorMessage);

    value = "/a/&/b*c.txt";
    expect(test).to.throw(Error, errorMessage);
  });
});
