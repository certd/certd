import assert from "node:assert/strict";
import { LocalCaProviderSyncService } from "./local-ca-provider-sync-service.js";

function createCa(overrides: any = {}) {
  return {
    id: 4,
    name: "北京分公司中间CA",
    caType: "intermediate",
    acmeEnabled: true,
    disabled: false,
    revoked: false,
    rotatedToId: null,
    deleted: false,
    notAfter: Date.now() + 86400000,
    ...overrides,
  };
}

function createService(cas: any[], providers: any[]) {
  const service = new LocalCaProviderSyncService();
  const settings: any = { customAcmeProviders: providers };
  const saves: any[] = [];
  (service as any).repository = {
    async findOne({ where }: any) {
      return cas.find(item => Number(item.id) === Number(where.id)) || null;
    },
    async find() {
      return cas.filter(item => !item.deleted);
    },
    async save(ca: any) {
      const idx = cas.findIndex(item => Number(item.id) === Number(ca.id));
      if (idx >= 0) {
        cas[idx] = ca;
      } else {
        cas.push(ca);
      }
      return ca;
    },
    async update({ id }: any, partial: any) {
      const idx = cas.findIndex(item => Number(item.id) === Number(id));
      if (idx >= 0) {
        cas[idx] = { ...cas[idx], ...partial };
      }
      return { affected: idx >= 0 ? 1 : 0 };
    },
  };
  (service as any).sysSettingsService = {
    async getPrivateSettings() {
      return settings;
    },
    async savePrivateSettings(bean: any) {
      saves.push(JSON.parse(JSON.stringify(bean.customAcmeProviders)));
      settings.customAcmeProviders = bean.customAcmeProviders;
    },
  };
  (service as any).crlService = {
    async resolveBaseUrl() {
      return "https://certd.example.com/";
    },
  };
  return { service, settings, saves };
}

const unrelated = { title: "外部CA", sslProvider: "extca", directoryUrl: "https://ext.example.com/directory", needEAB: false, builtIn: false };

describe("LocalCaProviderSyncService", () => {
  it("启用ACME的中间CA自动upsert同步条目，保留无关条目", async () => {
    const { service, settings, saves } = createService([createCa()], [{ ...unrelated }]);
    await service.syncForCa(4);
    assert.equal(saves.length, 1);
    assert.equal(settings.customAcmeProviders.length, 2);
    assert.equal(settings.customAcmeProviders[0].sslProvider, "extca");
    const entry = settings.customAcmeProviders[1];
    assert.equal(entry.sslProvider, "local-ca-4");
    assert.equal(entry.localCaId, 4);
    assert.equal(entry.title, "北京分公司中间CA");
    assert.equal(entry.directoryUrl, "https://certd.example.com/api/acme/4/directory");
    assert.equal(entry.needEAB, true);
    assert.equal(entry.enabled, true);
  });

  it("内容无变化时不写设置", async () => {
    const { service, saves } = createService([createCa()], []);
    await service.syncForCa(4);
    await service.syncForCa(4);
    assert.equal(saves.length, 1);
  });

  it("CA禁用/关闭ACME/已轮换时移除同步条目", async () => {
    for (const overrides of [{ disabled: true }, { acmeEnabled: false }, { rotatedToId: 9 }, { revoked: true }, { deleted: true }]) {
      const ca = createCa(overrides);
      const entry = { sslProvider: "local-ca-4", localCaId: 4, title: "x", directoryUrl: "https://certd.example.com/api/acme/4/directory" };
      const { service, settings } = createService([ca], [{ ...unrelated }, entry]);
      await service.syncForCa(4);
      assert.equal(settings.customAcmeProviders.length, 1, JSON.stringify(overrides));
      assert.equal(settings.customAcmeProviders[0].sslProvider, "extca");
    }
  });

  it("removeForCa只移除对应CA条目", async () => {
    const other = { sslProvider: "local-ca-7", localCaId: 7, title: "other", directoryUrl: "https://certd.example.com/api/acme/7/directory" };
    const entry = { sslProvider: "local-ca-4", localCaId: 4, title: "x", directoryUrl: "https://certd.example.com/api/acme/4/directory" };
    const { service, settings } = createService([], [{ ...unrelated }, other, entry]);
    await service.removeForCa(4);
    assert.deepEqual(
      settings.customAcmeProviders.map((item: any) => item.sslProvider),
      ["extca", "local-ca-7"]
    );
  });

  it("轮换保留稳定sslProvider/enabled/reverseProxy，更新指向新CA", async () => {
    const oldCa = createCa({ disabled: true, rotatedToId: 9 });
    const newCa = createCa({ id: 9, name: "北京分公司中间CA G2" });
    const entry = {
      sslProvider: "local-ca-4",
      localCaId: 4,
      title: "北京分公司中间CA",
      directoryUrl: "https://certd.example.com/api/acme/4/directory",
      needEAB: true,
      builtIn: false,
      enabled: false,
      reverseProxy: "proxy.example.com",
    };
    const { service, settings } = createService([oldCa, newCa], [{ ...unrelated }, entry]);
    await service.onRotated(4, 9);
    const rotated = settings.customAcmeProviders.find((item: any) => item.sslProvider === "local-ca-4");
    assert.equal(rotated.localCaId, 9);
    assert.equal(rotated.title, "北京分公司中间CA G2");
    assert.equal(rotated.directoryUrl, "https://certd.example.com/api/acme/9/directory");
    assert.equal(rotated.enabled, false);
    assert.equal(rotated.reverseProxy, "proxy.example.com");
    // 不应额外新增 local-ca-9 条目
    assert.equal(settings.customAcmeProviders.filter((item: any) => item.localCaId != null).length, 1);
  });

  it("旧CA无条目时轮换后为新CA补建", async () => {
    const oldCa = createCa({ disabled: true, rotatedToId: 9 });
    const newCa = createCa({ id: 9, name: "G2" });
    const { service, settings } = createService([oldCa, newCa], []);
    await service.onRotated(4, 9);
    assert.equal(settings.customAcmeProviders.length, 1);
    assert.equal(settings.customAcmeProviders[0].sslProvider, "local-ca-9");
    assert.equal(settings.customAcmeProviders[0].localCaId, 9);
  });

  it("采纳legacy quick-add条目（无localCaId标记）并更新", async () => {
    const legacy = {
      title: "旧名称",
      sslProvider: "local-ca-4",
      directoryUrl: "https://certd.example.com/api/acme/4/directory",
      needEAB: true,
      builtIn: false,
    };
    const { service, settings } = createService([createCa()], [legacy]);
    await service.syncForCa(4);
    assert.equal(settings.customAcmeProviders.length, 1);
    assert.equal(settings.customAcmeProviders[0].localCaId, 4);
    assert.equal(settings.customAcmeProviders[0].title, "北京分公司中间CA");
  });

  it("reconcileAll清理孤儿条目并按CA状态重建", async () => {
    const orphan = { sslProvider: "local-ca-99", localCaId: 99, title: "孤儿", directoryUrl: "https://certd.example.com/api/acme/99/directory" };
    const { service, settings, saves } = createService([createCa()], [{ ...unrelated }, orphan]);
    await service.reconcileAll();
    assert.equal(saves.length, 1);
    assert.deepEqual(
      settings.customAcmeProviders.map((item: any) => item.sslProvider),
      ["extca", "local-ca-4"]
    );
  });

  it("reconcileAll无变化时不写设置", async () => {
    const { service, saves } = createService([createCa()], []);
    await service.reconcileAll();
    await service.reconcileAll();
    assert.equal(saves.length, 1);
  });

  it("轮换后禁用再启用ACME仍恢复稳定sslProvider lineage", async () => {
    const oldCa = createCa();
    const newCa = createCa({ id: 9, name: "G2" });
    const { service, settings } = createService([oldCa, newCa], []);
    await service.syncForCa(4);
    oldCa.disabled = true;
    oldCa.rotatedToId = 9;
    await service.onRotated(4, 9);
    await service.removeForCa(9);
    assert.equal(settings.customAcmeProviders.length, 0);
    await service.syncForCa(9);
    assert.equal(settings.customAcmeProviders.length, 1);
    assert.equal(settings.customAcmeProviders[0].sslProvider, "local-ca-4");
    assert.equal(settings.customAcmeProviders[0].localCaId, 9);
  });

  it("根CA不同步", async () => {
    const { service, settings } = createService([createCa({ caType: "root" })], []);
    await service.syncForCa(4);
    assert.equal(settings.customAcmeProviders.length, 0);
  });
});