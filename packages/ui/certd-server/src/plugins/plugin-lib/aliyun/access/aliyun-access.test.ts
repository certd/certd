/// <reference types="mocha" />

import assert from "node:assert/strict";

import { AliyunAccess } from "./aliyun-access.js";

function createAccess(result: Record<string, unknown>) {
  const access = new AliyunAccess();
  access.ctx = {
    logger: {
      log() {},
    },
  } as any;
  access.getStsClient = async () =>
    ({
      getCallerIdentity: async () => result,
    }) as any;
  return access;
}

describe("AliyunAccess", () => {
  it("rejects STS error responses when testing access keys", async () => {
    const access = createAccess({
      Code: "InvalidAccessKeyId.NotFound",
      Message: "Specified access key is not found.",
      RequestId: "request-id",
    });

    await assert.rejects(() => access.onTestRequest(), /InvalidAccessKeyId\.NotFound/);
  });

  it("returns ok for valid STS identity responses", async () => {
    const access = createAccess({
      AccountId: "123456789",
      Arn: "acs:ram::123456789:user/test",
      UserId: "test-user",
    });

    assert.equal(await access.onTestRequest(), "ok");
  });
});
