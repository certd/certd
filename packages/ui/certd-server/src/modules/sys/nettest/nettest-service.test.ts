import assert from "node:assert/strict";
import esmock from "esmock";
import type { Context } from "mocha";

describe("NetTestService input validation", () => {
  it("rejects shell syntax before starting ping", async function (this: Context) {
    this.timeout(10000);
    let spawnCount = 0;
    const { NetTestService } = await esmock("./nettest-service.js", {
      "@certd/basic": {
        http: {},
        logger: { error() {} },
        utils: {
          sp: {
            async spawn() {
              spawnCount++;
              return "";
            },
          },
        },
      },
    });
    const service = new NetTestService();

    const result = await service.ping("example.com; echo injected");

    assert.equal(result.success, false);
    assert.equal(spawnCount, 0);
  });
});
