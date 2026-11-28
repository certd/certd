import assert from "node:assert/strict";
import { TaskServiceGetter, restrictServiceGetter } from "./task-service-getter.js";

describe("TaskServiceGetter local CA signer boundary", () => {
  function createGetter() {
    return new TaskServiceGetter(1, undefined, {
      async getAsync() {
        return {};
      },
    } as any);
  }

  it("非 CertApplyLocalCa 插件不能获取签发能力", async () => {
    const getter = createGetter().forPlugin("CertApply");
    await assert.rejects(() => getter.get("localCaSignerGetter"), /无权获取本地CA签发能力/);
  });

  it("仅服务端白名单插件类型可获取本地CA能力", async () => {
    const localCa = createGetter().forPlugin("CertApplyLocalCa");
    assert.ok(await localCa.get("localCaSignerGetter"));
    assert.ok(await localCa.get("localCaGetter"));

    const acmeAccount = createGetter().forPlugin("acmeAccount");
    assert.ok(await acmeAccount.get("localCaGetter"));
    await assert.rejects(() => acmeAccount.get("localCaSignerGetter"), /无权获取本地CA签发能力/);
  });

  it("插件声明不能提升本地CA能力", async () => {
    const getter = createGetter().forPlugin("CertApply");
    await assert.rejects(() => getter.get("localCaGetter"), /无权获取本地CA读取能力/);
  });

  it("传给插件的外部getter不暴露forPlugin", async () => {
    const getter = createGetter().forPlugin("CertApply");
    const restricted: any = restrictServiceGetter(getter);
    assert.equal(restricted.forPlugin, undefined);
    await assert.rejects(() => restricted.get("localCaSignerGetter"), /无权获取本地CA签发能力/);
  });
});
