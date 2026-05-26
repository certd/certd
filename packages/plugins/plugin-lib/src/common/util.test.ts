/// <reference types="mocha" />

import { expect } from "chai";

import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "./util.js";

describe("plugin-lib common util", () => {
  it("builds cert domain getter input define with defaults", () => {
    const define = createCertDomainGetterInputDefine();

    expect(define.title).to.equal("当前证书域名");
    expect(define.component.name).to.equal("cert-domains-getter");
    expect(define.required).to.equal(true);
    expect(define.template).to.equal(false);
    expect(define.mergeScript).to.contain("form.cert");
  });

  it("allows overriding cert input key and props", () => {
    const define = createCertDomainGetterInputDefine({
      certInputKey: "customCert",
      props: {
        title: "自定义域名",
        required: false,
      },
    });

    expect(define.title).to.equal("自定义域名");
    expect(define.required).to.equal(false);
    expect(define.mergeScript).to.contain("form.customCert");
  });

  it("builds remote select input define with expected component options", () => {
    const define = createRemoteSelectInputDefine({
      title: "选择资源",
      action: "ListResource",
      typeName: "resource",
      single: true,
      search: true,
      watches: ["region"],
    });

    expect(define.title).to.equal("选择资源");
    expect(define.required).to.equal(true);
    expect(define.component).to.include({
      name: "remote-select",
      vModel: "value",
      action: "ListResource",
      typeName: "resource",
      mode: "tags",
      single: true,
      search: true,
    });
    expect(define.component.watches).to.deep.equal(["certDomains", "accessId", "region"]);
  });
});
