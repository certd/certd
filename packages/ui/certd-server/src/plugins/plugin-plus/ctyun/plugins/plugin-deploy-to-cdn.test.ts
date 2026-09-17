/// <reference types="mocha" />

import assert from "node:assert/strict";
import { utils } from "@certd/basic";

import { CtyunClient } from "../lib.js";
import { CtyunDeployToCDN } from "./plugin-deploy-to-cdn.js";

describe("CtyunDeployToCDN", () => {
  it("加速域名远程选择框监听产品类型变化", () => {
    const input = (CtyunDeployToCDN as any).define.input;

    assert.equal(input.domains.component.name, "remote-select");
    assert.equal(input.domains.component.action, "onGetDomainList");
    assert.deepEqual(input.domains.component.watches, ["certDomains", "accessId", "productCode"]);
  });

  it("未选择产品类型时给出明确提示", async () => {
    const plugin = new CtyunDeployToCDN();
    plugin.productCode = "";

    await assert.rejects(() => plugin.onGetDomainList(), /请先选择产品类型/);
  });

  it("加速域名选项携带 domain 字段，证书域名才能匹配上", async () => {
    const plugin = new CtyunDeployToCDN();
    plugin.accessId = "access-1";
    plugin.productCode = "008";
    plugin.certDomains = ["a.example.com", "*.example.com"];
    plugin.getAccess = async () => {
      return { accessKeyId: "ak", securityKey: "sk" } as any;
    };
    plugin.ctx = {
      http: {},
      logger: { info: () => undefined, warn: () => undefined },
      utils,
    } as any;

    const originalGetDomainList = CtyunClient.prototype.getDomainList;
    CtyunClient.prototype.getDomainList = async request => {
      assert.deepEqual(request, { productCode: "008" });
      return [
        { domain: "a.example.com", product_code: "008" },
        { domain: "b.example.com", product_code: "008" },
        { domain: "other.com", product_code: "008" },
      ] as any;
    };
    try {
      const options = await plugin.onGetDomainList();
      assert.deepEqual(options, [
        { value: "matched", disabled: true, label: "----已匹配----" },
        { label: "a.example.com", value: "a.example.com", domain: "a.example.com" },
        { label: "b.example.com", value: "b.example.com", domain: "b.example.com" },
        { value: "unmatched", disabled: true, label: "----未匹配----" },
        { label: "other.com", value: "other.com", domain: "other.com" },
      ]);
    } finally {
      CtyunClient.prototype.getDomainList = originalGetDomainList;
    }
  });
});
