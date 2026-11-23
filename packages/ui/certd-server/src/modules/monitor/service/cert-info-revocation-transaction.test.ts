import assert from "node:assert/strict";
import { DataSource } from "typeorm";
import { CertInfoEntity, CertStatus } from "../entity/cert-info.js";
import { CertRevocationEntity } from "../../cert/entity/cert-revocation.js";
import { CertInfoService } from "./cert-info-service.js";
import { CertRevocationService } from "../../cert/service/cert-revocation-service.js";

async function createDataSource() {
  const ds = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    entities: [CertInfoEntity, CertRevocationEntity],
    synchronize: true,
  });
  await ds.initialize();
  return ds;
}

async function addCert(repo: any, serialNumber: string) {
  return await repo.save(
    repo.create({
      userId: 1,
      domain: "tx.example.com",
      domains: "tx.example.com",
      domainCount: 1,
      wildcardDomainCount: 0,
      pipelineId: 1,
      applyTime: Date.now(),
      fromType: "pipeline",
      certProvider: "test",
      effectiveTime: Date.now(),
      expiresTime: Date.now() + 86400000,
      certInfo: "{}",
      certFile: "",
      projectId: 0,
      status: CertStatus.active,
      localCaId: 2,
      serialNumber,
    })
  );
}

describe("CertInfoService local revocation transaction", () => {
  it("吊销记录与证书状态在同一事务提交", async function (this: any) {
    let ds: DataSource;
    try {
      ds = await createDataSource();
    } catch (e: any) {
      return this.skip();
    }
    try {
      const service = new CertInfoService();
      const revocation = new CertRevocationService();
      service.repository = ds.getRepository(CertInfoEntity);
      revocation.repository = ds.getRepository(CertRevocationEntity);
      service.certRevocationService = revocation;

      const cert = await addCert(service.repository, "0A11");
      await service.applyLocalRevocation({
        certInfoId: cert.id,
        caId: 2,
        userId: 1,
        serialNumber: "0A11",
        expiresTime: cert.expiresTime,
      });

      const saved = await service.repository.findOneBy({ id: cert.id });
      assert.equal(saved.status, CertStatus.revoked);
      assert.ok(saved.revokeTime > 0);
      assert.equal(await revocation.listByCa(2).then(list => list.length), 1);
    } finally {
      await ds.destroy();
    }
  });

  it("证书状态更新失败时吊销记录必须回滚", async function (this: any) {
    let ds: DataSource;
    try {
      ds = await createDataSource();
    } catch (e: any) {
      return this.skip();
    }
    try {
      const service = new CertInfoService();
      const revocation = new CertRevocationService();
      service.repository = ds.getRepository(CertInfoEntity);
      revocation.repository = ds.getRepository(CertRevocationEntity);
      service.certRevocationService = revocation;

      const cert = await addCert(service.repository, "0A22");
      await ds.query(`CREATE TRIGGER fail_local_cert_revoke
        BEFORE UPDATE ON cd_cert_info
        WHEN NEW.status = 'revoked'
        BEGIN
          SELECT RAISE(ABORT, '模拟证书状态更新失败');
        END`);
      await assert.rejects(
        () =>
          service.applyLocalRevocation({
            certInfoId: cert.id,
            caId: 2,
            userId: 1,
            serialNumber: "0A22",
            expiresTime: cert.expiresTime,
          }),
        /模拟证书状态更新失败/
      );

      const list = await revocation.listByCa(2);
      assert.equal(list.length, 0);
      const saved = await service.repository.findOneBy({ id: cert.id });
      assert.equal(saved.status, CertStatus.active);
    } finally {
      await ds.destroy();
    }
  });
});
