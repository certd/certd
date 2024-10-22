import { describe, expect, it } from "vitest";
import { isDomain } from "/@/plugin/validator";

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
    expect(test).to.throw(Error, "域名有误：&.cc.com，请输入正确的域名");

    value = ["a,cc.com"];
    expect(test).to.throw(Error, "域名有误：a,cc.com，请输入正确的域名");

    value = ["&cc.com"];
    expect(test).to.throw(Error, "域名有误：&cc.com，请输入正确的域名");

    value = [".cc.com"];
    expect(test()).to.be.true;
  });

  it("default", () => {
    let value = ["&.cc.com"];
    function test() {
      return isDomain({ allowDotStart: false }, value);
    }
    expect(test).to.throw(Error, "域名有误：&.cc.com，请输入正确的域名");

    value = ["&cc.com"];
    expect(test).to.throw(Error, "域名有误：&cc.com，请输入正确的域名");

    value = ["a,cc.com"];
    expect(test).to.throw(Error, "域名有误：a,cc.com，请输入正确的域名");

    value = [".cc.com"];
    expect(test).to.throw(Error, "域名有误：.cc.com，请输入正确的域名");
  });
});
