/// <reference types="mocha" />

import assert from "node:assert/strict";
import { DeployCertToTencentCLB } from "./index.js";

describe("DeployCertToTencentCLB", () => {
  it("uses remote single-select inputs for CLB and HTTPS listener", () => {
    const input = (DeployCertToTencentCLB as any).define.input;

    assert.equal(input.loadBalancerId.component.name, "remote-select");
    assert.equal(input.loadBalancerId.component.single, true);
    assert.equal(input.loadBalancerId.component.action, "onGetCLBList");
    assert.equal(input.loadBalancerId.required, true);

    assert.equal(input.listenerId.component.name, "remote-select");
    assert.equal(input.listenerId.component.single, true);
    assert.equal(input.listenerId.component.action, "onGetListenerList");
    assert.deepEqual(input.listenerId.component.watches, ["certDomains", "accessId", "region", "loadBalancerId"]);
    assert.equal(input.listenerId.required, true);

    assert.equal(input.domain.component.name, "remote-select");
    assert.equal(input.domain.component.single, false);
    assert.equal(input.domain.component.action, "onGetDomainList");
    assert.deepEqual(input.domain.component.watches, ["certDomains", "accessId", "region", "loadBalancerId", "listenerId"]);
    assert.equal(input.domain.required, false);
  });

  it("maps CLB API results to remote-select options", async () => {
    const plugin = new DeployCertToTencentCLB();
    plugin.accessId = "access-1";
    plugin.logger = { info: () => undefined } as any;
    (plugin as any).getClient = async () => ({});
    (plugin as any).getCLBList = async () => [
      {
        LoadBalancerId: "lb-1",
        LoadBalancerName: "业务负载均衡",
      },
    ];

    const options = await plugin.onGetCLBList({});

    assert.deepEqual(options, [
      {
        value: "lb-1",
        label: "业务负载均衡<lb-1>",
      },
    ]);
  });

  it("maps HTTPS listener API results after selecting a CLB", async () => {
    const plugin = new DeployCertToTencentCLB();
    plugin.accessId = "access-1";
    plugin.loadBalancerId = "lb-1";
    plugin.logger = { info: () => undefined } as any;
    (plugin as any).getClient = async () => ({});
    (plugin as any).getListenerList = async (_client: any, loadBalancerId: string, listenerIds: any) => {
      assert.equal(loadBalancerId, "lb-1");
      assert.equal(listenerIds, null);
      return [
        {
          ListenerId: "listener-1",
          ListenerName: "HTTPS监听器",
          Port: 443,
        },
      ];
    };

    const options = await plugin.onGetListenerList({});

    assert.deepEqual(options, [
      {
        value: "listener-1",
        label: "HTTPS监听器:443<listener-1>",
      },
    ]);
  });

  it("maps SNI domains from the selected listener rules", async () => {
    const plugin = new DeployCertToTencentCLB();
    plugin.accessId = "access-1";
    plugin.loadBalancerId = "lb-1";
    plugin.listenerId = "listener-1";
    plugin.logger = { info: () => undefined } as any;
    (plugin as any).getClient = async () => ({});
    (plugin as any).getListenerList = async (_client: any, loadBalancerId: string, listenerIds: string[]) => {
      assert.equal(loadBalancerId, "lb-1");
      assert.deepEqual(listenerIds, ["listener-1"]);
      return [
        {
          ListenerId: "listener-1",
          Rules: [{ Domain: "www.example.com" }, { Domain: "api.example.com" }],
        },
      ];
    };

    const options = await plugin.onGetDomainList({});

    assert.deepEqual(options, [
      {
        value: "www.example.com",
        label: "www.example.com",
        domain: "www.example.com",
      },
      {
        value: "api.example.com",
        label: "api.example.com",
        domain: "api.example.com",
      },
    ]);
  });
});
