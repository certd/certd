/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";

import { http } from "@certd/basic";

import { TldClient } from "./tld-client.js";

describe("TldClient", () => {
  it("falls back to rdap.ss after RDAP and whoiser fail", async () => {
    const client = new TldClient() as any;
    const calls: string[] = [];

    client.init = async () => {};
    client.getDomainExpirationByRdap = async () => {
      calls.push("rdap");
      throw new Error("rdap failed");
    };
    client.getDomainExpirationByWhoiser = async () => {
      calls.push("whoiser");
      throw new Error("whoiser failed");
    };
    client.getDomainExpirationByRdapSs = async () => {
      calls.push("rdap.ss");
      return { expirationDate: 1795104000000 };
    };

    const result = await client.getDomainExpirationDate("google.com.hk");

    assert.deepEqual(calls, ["rdap", "whoiser", "rdap.ss"]);
    assert.equal(result.expirationDate, 1795104000000);
  });

  it("queries rdap.ss and parses HK whois date fields", async () => {
    const originalRequest = http.request;
    let requestedConfig: any;
    const originalRequestTimes = (TldClient as any).rdapSsRequestTimes;

    try {
      (TldClient as any).rdapSsRequestTimes = [];
      http.request = async (config: any) => {
        requestedConfig = config;
        return {
          success: true,
          data: {
            whoisData: {
              "Domain Name Commencement Date": "14-07-2001",
              "Expiry Date": "20-11-2026",
            },
          },
        };
      };

      const result = await (new TldClient() as any).getDomainExpirationByRdapSs("google.com.hk");

      assert.equal(requestedConfig.url, "https://rdap.ss/api/query?q=google.com.hk");
      assert.equal(requestedConfig.method, "GET");
      assert.equal(result.registrationDate, 995040000000);
      assert.equal(result.expirationDate, 1795104000000);
    } finally {
      http.request = originalRequest;
      (TldClient as any).rdapSsRequestTimes = originalRequestTimes;
    }
  });

  it("throws when rdap.ss rate-limit wait is over 3 minutes", async () => {
    const now = Date.now();
    const originalRequestTimes = (TldClient as any).rdapSsRequestTimes;

    try {
      (TldClient as any).rdapSsRequestTimes = Array.from({ length: 1200 }, () => now);
      const client = new TldClient() as any;
      client.sleep = async () => {
        throw new Error("should not sleep when wait time is over limit");
      };

      await assert.rejects(() => client.waitRdapSsRateLimit(), /rdap\.ss查询达到速率限制，等待时间超过3分钟/);
    } finally {
      (TldClient as any).rdapSsRequestTimes = originalRequestTimes;
    }
  });
});
