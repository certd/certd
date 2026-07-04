/// <reference types="mocha" />

import assert from "node:assert/strict";
import { AliyunDeployCertToESA } from "./index.js";

describe("AliyunDeployCertToESA", () => {
  it("has deployMode field with default value 'edge'", () => {
    const input = (AliyunDeployCertToESA as any).define.input.deployMode;
    assert.equal(input.value, "edge");
    assert.equal(input.component.name, "a-radio-group");
    assert.deepEqual(input.component.options, [
      { label: "边缘证书", value: "edge" },
      { label: "SaaS证书", value: "saas" },
    ]);
  });

  it("has saasDomainIds field with conditional show", () => {
    const input = (AliyunDeployCertToESA as any).define.input.saasDomainIds;
    assert.equal(input.component.name, "remote-select");
    assert.equal(input.component.action, "onGetCustomHostnameList");
    assert.equal(input.required, false);
    assert.match(input.mergeScript, /form.deployMode === 'saas'/);
  });

  it("executeSaaS throws error when no site is selected", async () => {
    const plugin = new AliyunDeployCertToESA();
    plugin.logger = { info: () => undefined } as any;
    plugin.deployMode = "saas";
    plugin.siteIds = [];

    await assert.rejects(() => (plugin as any).executeSaaS(null, null, 1, "test"), /SaaS证书模式下请先选择站点/);
  });

  it("executeSaaS throws error when multiple sites are selected", async () => {
    const plugin = new AliyunDeployCertToESA();
    plugin.logger = { info: () => undefined } as any;
    plugin.deployMode = "saas";
    plugin.siteIds = ["site1", "site2"];

    await assert.rejects(() => (plugin as any).executeSaaS(null, null, 1, "test"), /SaaS证书模式下站点只能单选/);
  });

  it("executeSaaS throws error when no SaaS domains selected", async () => {
    const plugin = new AliyunDeployCertToESA();
    plugin.logger = { info: () => undefined } as any;
    plugin.deployMode = "saas";
    plugin.siteIds = ["site1"];
    plugin.saasDomainIds = [];

    await assert.rejects(() => (plugin as any).executeSaaS(null, null, 1, "test"), /SaaS证书模式下请选择要部署的SaaS域名/);
  });

  it("executeSaaS calls UpdateCustomHostname for each selected SaaS domain", async () => {
    const plugin = new AliyunDeployCertToESA();
    plugin.logger = { info: () => undefined, error: () => undefined } as any;
    plugin.deployMode = "saas";
    plugin.siteIds = ["site1"];
    plugin.saasDomainIds = ["1001", "1002"];
    plugin.regionId = "cn-hangzhou";

    const calledHostnameIds: number[] = [];
    const mockClient = {
      doRequest: async (req: any) => {
        calledHostnameIds.push(req.data.body.HostnameId);
        return {};
      },
    };

    await (plugin as any).executeSaaS(mockClient, null, 12345, "test-cert");

    assert.deepEqual(calledHostnameIds, [1001, 1002]);
  });

  it("executeSaaS handles Certificate.Duplicated error gracefully", async () => {
    const plugin = new AliyunDeployCertToESA();
    plugin.logger = { info: () => undefined, error: () => undefined } as any;
    plugin.deployMode = "saas";
    plugin.siteIds = ["site1"];
    plugin.saasDomainIds = ["1001"];
    plugin.regionId = "cn-hangzhou";

    let callCount = 0;
    const mockClient = {
      doRequest: async (req: any) => {
        callCount++;
        throw new Error("Certificate.Duplicated");
      },
    };

    await (plugin as any).executeSaaS(mockClient, null, 12345, "test-cert");
    assert.equal(callCount, 1);
  });

  it("executeEdge calls SetCertificate for each site", async () => {
    const plugin = new AliyunDeployCertToESA();
    plugin.logger = { info: () => undefined, error: () => undefined } as any;
    plugin.siteIds = ["site1", "site2"];
    plugin.certLimit = 2;

    const calledSites: string[] = [];
    const mockClient = {
      doRequest: async (req: any) => {
        if (req.action === "SetCertificate") {
          calledSites.push(req.data.body.SiteId);
        }
        return { Result: [] };
      },
    };

    await (plugin as any).executeEdge(mockClient, 12345, "test-cert");

    assert.deepEqual(calledSites, ["site1", "site2"]);
  });
});
