import assert from "node:assert/strict";
import { TaskServiceGetter } from "./task-service-getter.js";

describe("TaskServiceGetter local CA signer boundary", () => {
  function createGetter() {
    return new TaskServiceGetter(1, undefined, {
      async getAsync() {
        return {};
      },
    } as any);
  }

  it("非 CertApplyLocalCa 插件不能获取签发能力", async () => {
    const getter = createGetter();
    getter.setPluginType("CertApply");
    await assert.rejects(() => getter.get("localCaSignerGetter"), /无权获取本地CA签发能力/);
  });

  it("CertApplyLocalCa 可以获取签发能力", async () => {
    const getter = createGetter();
    getter.setPluginType("CertApplyLocalCa");
    const signer = await getter.get("localCaSignerGetter");
    assert.ok(signer);
  });
});
