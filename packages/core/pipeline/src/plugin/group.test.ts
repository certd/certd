/// <reference types="mocha" />

import { expect } from "chai";

import { PluginGroup, pluginGroups } from "./group.js";

describe("PluginGroup", () => {
  it("initializes a group with defaults", () => {
    const group = new PluginGroup("custom", "Custom");

    expect(group.key).to.equal("custom");
    expect(group.title).to.equal("Custom");
    expect(group.order).to.equal(0);
    expect(group.icon).to.equal("");
    expect(group.plugins).to.deep.equal([]);
  });

  it("exposes built-in groups with stable keys", () => {
    expect(pluginGroups.cert.key).to.equal("cert");
    expect(pluginGroups.host.key).to.equal("host");
    expect(pluginGroups.other.order).to.equal(10);
  });
});
