import assert from "assert";
import { utils } from "@certd/basic";
import { NonRetryableException } from "@certd/lib-server";
import { CertApplyPlugin } from "./apply.js";

describe("CertApplyPlugin dns-persist verify plan", () => {
  it("keeps dns-persist entries when building mixed domain verify plans", async () => {
    const plugin: any = new CertApplyPlugin();
    plugin.acme = {
      options: {
        domainParser: {
          async parse(domain: string) {
            return domain;
          },
        },
      },
    };

    const plan = await plugin.createDomainsVerifyPlan(
      ["*.handfree.work"],
      {
        "handfree.work": {
          domain: "handfree.work",
          type: "dns-persist",
          dnsPersistVerifyPlan: {
            "handfree.work": {
              domain: "handfree.work",
              status: "valid",
              hostRecord: "_validation-persist",
              recordValue: "letsencrypt.org; accounturi=https://acme.example/acct/1; policy=wildcard",
              accountUri: "https://acme.example/acct/1",
            },
          },
        },
      },
      {
        accountKey: "private-key",
        accountUri: "https://acme.example/acct/1",
        caType: "letsencrypt_staging",
        email: "user@example.com",
        directoryUrl: "https://acme-staging-v02.api.letsencrypt.org/directory",
      }
    );

    assert.equal(plan["handfree.work"].type, "dns-persist");
    assert.equal(plan["handfree.work"].dnsPersistVerifyPlan?.hostRecord, "_validation-persist");
    assert.equal(plan["handfree.work"].dnsPersistVerifyPlan?.recordValue, "letsencrypt.org; accounturi=https://acme.example/acct/1; policy=wildcard");
  });
});

describe("CertApplyPlugin certificate apply retry", () => {
  it("does not retry by default", async () => {
    const plugin: any = new CertApplyPlugin();
    let orderCount = 0;
    const error = new Error("apply failed");
    plugin.logger = { warn() {} };
    plugin.acme = {
      async order() {
        orderCount++;
        throw error;
      },
    };

    await assert.rejects(plugin.orderWithRetry({}), error);
    assert.equal(orderCount, 1);
    assert.equal(plugin.certApplyRetryCount, 0);
  });

  it("retries after a 30-second cooldown and succeeds before reaching the limit", async () => {
    const plugin: any = new CertApplyPlugin();
    let orderCount = 0;
    const waitTimes: number[] = [];
    plugin.certApplyRetryCount = 2;
    plugin.logger = { warn() {} };
    plugin.acme = {
      async order() {
        orderCount++;
        if (orderCount < 3) {
          throw new Error(`apply failed ${orderCount}`);
        }
        return { crt: "certificate", key: "private-key" };
      },
    };
    const originalSleep = utils.sleep;
    utils.sleep = async (waitTime: number) => {
      waitTimes.push(waitTime);
    };

    try {
      const cert = await plugin.orderWithRetry({});

      assert.deepEqual(cert, { crt: "certificate", key: "private-key" });
      assert.equal(orderCount, 3);
      assert.deepEqual(waitTimes, [30_000, 30_000]);
    } finally {
      utils.sleep = originalSleep;
    }
  });

  it("throws the last error after reaching the retry limit", async () => {
    const plugin: any = new CertApplyPlugin();
    let orderCount = 0;
    const error = new Error("apply failed");
    plugin.certApplyRetryCount = 1;
    plugin.logger = { warn() {} };
    plugin.acme = {
      async order() {
        orderCount++;
        throw error;
      },
    };
    const originalSleep = utils.sleep;
    utils.sleep = async () => {};

    try {
      await assert.rejects(plugin.orderWithRetry({}), error);
      assert.equal(orderCount, 2);
    } finally {
      utils.sleep = originalSleep;
    }
  });

  it("does not retry a cancelled apply", async () => {
    const plugin: any = new CertApplyPlugin();
    let orderCount = 0;
    const error: any = new Error("cancelled");
    error.name = "CancelError";
    plugin.certApplyRetryCount = 2;
    plugin.logger = { warn() {} };
    plugin.acme = {
      async order() {
        orderCount++;
        throw error;
      },
    };

    await assert.rejects(plugin.orderWithRetry({}), error);
    assert.equal(orderCount, 1);
  });

  it("throws a non-retryable error for wildcard and normal domain conflicts", async () => {
    const plugin: any = new CertApplyPlugin();
    let orderCount = 0;
    const message = "example.com is redundant with a wildcard domain in the same request";
    plugin.certApplyRetryCount = 2;
    plugin.logger = { warn() {} };
    plugin.acme = {
      async order() {
        orderCount++;
        throw new NonRetryableException(`通配符域名已经包含了普通域名，请删除其中一个（${message}）`);
      },
    };
    await assert.rejects(plugin.orderWithRetry({}), (error: any) => {
      assert.equal(error instanceof NonRetryableException, true);
      assert.equal(error.message, `通配符域名已经包含了普通域名，请删除其中一个（${message}）`);
      return true;
    });
    assert.equal(orderCount, 1);
  });
});
