import { DataSource } from "typeorm";
import { LocalCaEntity } from "../dist/modules/local-ca/entity/local-ca.js";
import { LocalCaAdminEntity } from "../dist/modules/local-ca/entity/local-ca-admin.js";
import { AcmeEabEntity } from "../dist/modules/acme-server/entity/acme-server.js";
import { LocalCaService } from "../dist/modules/local-ca/service/local-ca-service.js";
import { runTransaction } from "../dist/modules/db/db-transaction.js";

const dialect = process.env.EAB_TEST_DB || "sqlite";

function assertTestDatabase(name) {
  if (!/^certd_.*_test$/.test(String(name || ""))) {
    throw new Error(`拒绝在非测试数据库 ${name} 上运行；数据库名必须以 certd_ 开头并以 _test 结尾`);
  }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function dataSourceOptions() {
  if (dialect === "mysql") {
    return {
      type: "mysql",
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT || 3306),
      username: process.env.MYSQL_USER || "certd_test",
      password: process.env.MYSQL_PASSWORD || "certd_test",
      database: process.env.MYSQL_DATABASE || "certd_eab_test",
      entities: [LocalCaEntity, LocalCaAdminEntity, AcmeEabEntity],
      synchronize: true,
    };
  }
  if (dialect === "postgres" || dialect === "pg") {
    return {
      type: "postgres",
      host: process.env.PG_HOST || "127.0.0.1",
      port: Number(process.env.PG_PORT || 5432),
      username: process.env.PG_USER || "postgres",
      password: process.env.PG_PASSWORD || "postgres",
      database: process.env.PG_DATABASE || "certd_eab_test",
      entities: [LocalCaEntity, LocalCaAdminEntity, AcmeEabEntity],
      synchronize: true,
    };
  }
  return {
    type: "better-sqlite3",
    database: ":memory:",
    entities: [LocalCaEntity, LocalCaAdminEntity, AcmeEabEntity],
    synchronize: true,
  };
}

function caEntity() {
  const entity = new LocalCaEntity();
  entity.id = 1;
  entity.name = "EAB Lock CA";
  entity.source = "generated";
  entity.caType = "intermediate";
  entity.parentId = null;
  entity.keyType = "rsa2048";
  entity.keySize = 2048;
  entity.hashAlgorithm = "SHA256";
  entity.subject = JSON.stringify({ CN: "EAB Lock CA" });
  entity.subjectCn = "EAB Lock CA";
  entity.certPem = "test-cert";
  entity.privateKeyEncrypted = "test-key";
  entity.keyEncryptVersion = "1";
  entity.privateKeyHash = "0".repeat(64);
  entity.fingerprintSha256 = "0".repeat(64);
  entity.notBefore = Date.now() - 1000;
  entity.notAfter = Date.now() + 86400000;
  entity.usage = "server";
  entity.maxValidityDays = 0;
  entity.acmeEnabled = true;
  entity.acmeDirectIssue = false;
  entity.crlNumber = 0;
  entity.exportDisabled = false;
  entity.deleted = false;
  entity.revoked = false;
  entity.disabled = false;
  entity.remark = "";
  return entity;
}

function eabEntity() {
  const entity = new AcmeEabEntity();
  entity.id = "eab-lock";
  entity.caId = 1;
  entity.userId = 1;
  entity.name = "EAB Lock";
  entity.kid = "kid-lock";
  entity.hmacKeyEncrypted = "test-hmac";
  entity.hmacKeyHash = "0".repeat(64);
  entity.maxUses = 10;
  entity.usedCount = 0;
  entity.allowedDomains = null;
  entity.expiresTime = null;
  entity.disabled = false;
  return entity;
}

async function main() {
  const options = dataSourceOptions();
  if (options.type !== "better-sqlite3") {
    assertTestDatabase(options.database);
  }
  const ds = new DataSource(options);
  await ds.initialize();
  try {
    await ds.query("DELETE FROM cd_acme_eab");
    await ds.query("DELETE FROM cd_local_ca_admin");
    await ds.query("DELETE FROM cd_local_ca");
    await ds.getRepository(LocalCaEntity).save(caEntity());
    const adminRepo = ds.getRepository(LocalCaAdminEntity);
    await adminRepo.save(adminRepo.create({ caId: 1, adminUserId: 1, role: "owner" }));
    await ds.getRepository(AcmeEabEntity).save(eabEntity());
    const service = new LocalCaService();
    service.repository = ds.getRepository(LocalCaEntity);
    service.adminRepository = adminRepo;
    service.acmeEabRepository = ds.getRepository(AcmeEabEntity);

    let release;
    const gate = new Promise(resolve => (release = resolve));
    let finalizeInside = false;
    const finalize = runTransaction(ds.manager, async tx => {
      const profile = await service.getAcmeEabProfile("eab-lock", tx);
      if (!profile) {
        throw new Error("EAB disabled before finalize");
      }
      finalizeInside = true;
      await gate;
      return "signed";
    });

    while (!finalizeInside) {
      await sleep(20);
    }
    let disabledResolved = false;
    const disable = service
      .setAcmeEabDisabled({ caId: 1, eabId: "eab-lock", userId: 1, disabled: true })
      .then(() => {
        disabledResolved = true;
      });
    await sleep(150);
    if (disabledResolved) {
      throw new Error("EAB disable did not wait for finalize transaction");
    }
    release();
    await finalize;
    await disable;
    if ((await service.getAcmeEabProfile("eab-lock")) != null) {
      throw new Error("EAB still active after disable");
    }

    console.log(JSON.stringify({ dialect, ok: true, lockHeld: true, disabledAfterFinalize: true }));
  } finally {
    await ds.destroy();
  }
}

main().catch(e => {
  console.error(JSON.stringify({ dialect, ok: false, error: e?.message || String(e) }));
  process.exit(1);
});
