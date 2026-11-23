import assert from "node:assert/strict";
import { CertRevocationService } from "./cert-revocation-service.js";

function createService() {
  const store: any[] = [];
  const service = new CertRevocationService();
  service.repository = {
    create(data: any) {
      return { ...data };
    },
    async save(entity: any) {
      if (store.some(item => item.caId === entity.caId && item.serialNumber === entity.serialNumber)) {
        throw new Error("UNIQUE constraint failed");
      }
      entity.id = store.length + 1;
      store.push(entity);
      return entity;
    },
    async findOne({ where }: any) {
      return store.find(item => item.caId === where.caId && item.serialNumber === where.serialNumber) || null;
    },
    async find({ where }: any) {
      return store.filter(item => item.caId === where.caId);
    },
  } as any;
  return { service, store };
}

describe("CertRevocationService", () => {
  it("按CA和序列号规范化去重，重复吊销返回已有记录", async () => {
    const { service, store } = createService();
    const first = await service.record({
      caId: 2,
      userId: 1,
      certInfoId: 10,
      serialNumber: "ab:cd:ef",
      reason: "unspecified",
      expiresTime: Date.now() + 86400000,
    });
    const second = await service.record({
      caId: 2,
      userId: 1,
      certInfoId: 10,
      serialNumber: "abcdef",
      reason: "keyCompromise",
    });

    assert.equal(store.length, 1);
    assert.equal(first.id, second.id);
    assert.equal(second.reason, "unspecified");
    assert.equal(await service.findBySerial(2, "ABCDEF"), first);
    assert.equal(await service.findBySerial(3, "ABCDEF"), null);
  });

  it("删除证书记录后仍可按CA查询吊销记录", async () => {
    const { service, store } = createService();
    await service.record({ caId: 2, userId: 1, certInfoId: 10, serialNumber: "AA01" });
    store.splice(0, 1);

    await service.record({ caId: 2, userId: 1, certInfoId: 11, serialNumber: "AA02" });
    const list = await service.listByCa(2);

    assert.equal(list.length, 1);
    assert.equal(list[0].serialNumber, "AA02");
    assert.equal(list[0].certInfoId, 11);
  });
});
