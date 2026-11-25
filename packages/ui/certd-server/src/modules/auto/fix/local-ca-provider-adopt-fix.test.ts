import assert from "node:assert/strict";
import { LocalCaProviderAdoptFix } from "./local-ca-provider-adopt-fix.js";

describe("LocalCaProviderAdoptFix", () => {
  it("启动对账调用reconcileAll", async () => {
    const fix = new LocalCaProviderAdoptFix();
    let called = 0;
    (fix as any).providerSync = {
      async reconcileAll() {
        called++;
      },
    };
    assert.equal(await fix.init(), true);
    assert.equal(called, 1);
  });

  it("对账失败返回false不抛出", async () => {
    const fix = new LocalCaProviderAdoptFix();
    (fix as any).providerSync = {
      async reconcileAll() {
        throw new Error("db down");
      },
    };
    assert.equal(await fix.init(), false);
  });
});