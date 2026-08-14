/// <reference types="mocha" />

import assert from "node:assert/strict";
import { UniCloudClient } from "@certd/plugin-plus";
import { UniCloudDeployToSpace } from "./plugin-deploy-to-space.js";

describe("UniCloudDeployToSpace", () => {
  it("uses a remote selector for space domains", () => {
    const input = (UniCloudDeployToSpace as any).define.input;

    assert.equal(input.domains.component.name, "remote-select");
    assert.equal(input.domains.component.action, "onGetDomainList");
    assert.deepEqual(input.domains.component.watches, ["accessId", "spaceId", "provider"]);
  });

  it("maps UniCloud space domains to selector options", async () => {
    const plugin = new UniCloudDeployToSpace();
    plugin.accessId = "access-1";
    plugin.spaceId = "env-test";
    plugin.provider = "alipay";
    plugin.logger = { info: () => undefined } as any;
    plugin.http = {} as any;
    plugin.getAccess = async () => ({ email: "user@example.com", password: "password" } as any);

    const originalGetDomainList = UniCloudClient.prototype.getDomainList;
    UniCloudClient.prototype.getDomainList = async request => {
      assert.deepEqual(request, {
        provider: "alipay",
        spaceId: "env-test",
      });
      return [{ domain: "a.example.com" }, { domain: "b.example.com" }] as any;
    };
    try {
      const options = await plugin.onGetDomainList();
      assert.deepEqual(options, [
        { value: "a.example.com", label: "a.example.com", domain: "a.example.com" },
        { value: "b.example.com", label: "b.example.com", domain: "b.example.com" },
      ]);
    } finally {
      UniCloudClient.prototype.getDomainList = originalGetDomainList;
    }
  });
});
