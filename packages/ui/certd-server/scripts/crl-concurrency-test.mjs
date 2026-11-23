import { DataSource } from "typeorm";
import { Encryptor, EncryptService } from "@certd/lib-server";
import * as x509 from "@peculiar/x509";
import { LocalCaEntity } from "../dist/modules/cert/entity/local-ca.js";
import { CertRevocationEntity } from "../dist/modules/cert/entity/cert-revocation.js";
import { LocalCaService } from "../dist/modules/cert/service/local-ca-service.js";
import { CertRevocationService } from "../dist/modules/cert/service/cert-revocation-service.js";
import { createIntermediateCa, createRootCa, sha256Hex } from "../dist/modules/cert/service/local-ca-crypto.js";

const dialect = process.env.CRL_TEST_DB || "sqlite";

function assertTestDatabase(name) {
  if (!/^certd_.*_test$/.test(String(name || ""))) {
    throw new Error(`拒绝在非测试数据库 ${name} 上运行；数据库名必须以 certd_ 开头并以 _test 结尾`);
  }
}

function dataSourceOptions() {
  if (dialect === "mysql") {
    return {
      type: "mysql",
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT || 3306),
      username: process.env.MYSQL_USER || "certd_test",
      password: process.env.MYSQL_PASSWORD || "certd_test",
      database: process.env.MYSQL_DATABASE || "certd_crl_test",
      entities: [LocalCaEntity, CertRevocationEntity],
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
      database: process.env.PG_DATABASE || "certd_crl_test",
      entities: [LocalCaEntity, CertRevocationEntity],
      synchronize: true,
    };
  }
  return {
    type: "better-sqlite3",
    database: ":memory:",
    entities: [LocalCaEntity, CertRevocationEntity],
    synchronize: true,
  };
}

function caEntity({ id, type, name, certPem, privateKeyPem, parentId, notBefore, notAfter, pathLength }) {
  const entity = new LocalCaEntity();
  entity.id = id;
  entity.userId = 1;
  entity.projectId = null;
  entity.name = name;
  entity.source = "generated";
  entity.caType = type;
  entity.parentId = parentId;
  entity.keyType = "rsa2048";
  entity.keySize = 2048;
  entity.hashAlgorithm = "SHA256";
  entity.subject = JSON.stringify({ CN: name });
  entity.subjectCn = name;
  entity.certPem = certPem;
  entity.privateKeyEncrypted = this.encryptor.encrypt(privateKeyPem);
  entity.keyEncryptVersion = "1";
  entity.privateKeyHash = sha256Hex(privateKeyPem);
  entity.fingerprintSha256 = sha256Hex(certPem);
  entity.notBefore = notBefore;
  entity.notAfter = notAfter;
  entity.usage = "server";
  entity.maxValidityDays = 0;
  entity.acmeEnabled = false;
  entity.acmeDirectIssue = false;
  entity.crlNumber = 0;
  entity.exportDisabled = false;
  entity.deleted = false;
  entity.revoked = false;
  entity.disabled = false;
  entity.remark = "";
  entity.pathLength = pathLength;
  return entity;
}

async function main() {
  const options = dataSourceOptions();
  if (options.type !== "better-sqlite3") {
    assertTestDatabase(options.database);
  }
  const ds = new DataSource(options);
  await ds.initialize();
  // 只清理脚本自己的表，绝不 dropSchema
  await ds.query("DELETE FROM cd_cert_revocation");
  await ds.query("DELETE FROM cd_local_ca");
  const caRepo = ds.getRepository(LocalCaEntity);
  const revocationRepo = ds.getRepository(CertRevocationEntity);
  const encryptor = new Encryptor(Buffer.alloc(32, 7).toString("base64"));
  const encryptService = new EncryptService();
  encryptService.encryptor = encryptor;
  const revocationService = new CertRevocationService();
  revocationService.repository = revocationRepo;
  const service = new LocalCaService();
  service.repository = caRepo;
  service.certRevocationService = revocationService;
  service.encryptService = encryptService;

  try {
    const root = await createRootCa({ subject: { CN: "Concurrency Root" }, keyType: "rsa2048", validityYears: 2 });
    const rootEntity = caEntity.call(
      { encryptor },
      {
        id: 1,
        type: "root",
        name: "Concurrency Root",
        certPem: root.certPem,
        privateKeyPem: root.privateKeyPem,
        parentId: null,
        notBefore: root.notBefore,
        notAfter: root.notAfter,
        pathLength: 1,
      }
    );
    await caRepo.save(rootEntity);

    const children = [];
    for (let i = 0; i < 2; i++) {
      const intermediate = await createIntermediateCa({
        rootCertPem: root.certPem,
        rootPrivateKeyPem: root.privateKeyPem,
        subject: { CN: `Concurrency Intermediate ${i + 1}` },
        keyType: "rsa2048",
        validityYears: 1,
      });
      const entity = caEntity.call(
        { encryptor },
        {
          id: i + 2,
          type: "intermediate",
          name: `Concurrency Intermediate ${i + 1}`,
          certPem: intermediate.certPem,
          privateKeyPem: intermediate.privateKeyPem,
          parentId: 1,
          notBefore: intermediate.notBefore,
          notAfter: intermediate.notAfter,
          pathLength: 0,
        }
      );
      await caRepo.save(entity);
      children.push({ entity, serialNumber: intermediate.serialNumber });
    }

    const results = await Promise.allSettled([
      service.revokeIntermediate({ id: children[0].entity.id, userId: 1 }),
      service.revokeIntermediate({ id: children[1].entity.id, userId: 1 }),
      service.refreshRootCrl({ id: 1, userId: 1 }),
      service.refreshRootCrl({ id: 1, userId: 1 }),
    ]);
    const rejected = results.filter(item => item.status === "rejected");
    if (rejected.length > 0) {
      throw new Error(rejected.map(item => item.reason?.message || item.reason).join("; "));
    }

    const finalRoot = await caRepo.findOne({ where: { id: 1 } });
    if (!finalRoot.lastCrlPem) {
      throw new Error("final root CRL is empty");
    }
    const crl = new x509.X509Crl(finalRoot.lastCrlPem);
    const serials = crl.entries.map(entry => entry.serialNumber.toUpperCase());
    for (const child of children) {
      if (!serials.includes(child.serialNumber.toUpperCase())) {
        throw new Error(`CRL missing revoked intermediate ${child.serialNumber}`);
      }
    }
    const crlNumberExt = crl.extensions.find(ext => ext.type === "2.5.29.20");
    if (!crlNumberExt) {
      throw new Error("CRL number missing");
    }
    if (Number(finalRoot.crlNumber) < 4) {
      throw new Error(`unexpected CRL number ${finalRoot.crlNumber}`);
    }
    console.log(
      JSON.stringify({
        dialect,
        ok: true,
        rootCrlNumber: finalRoot.crlNumber,
        revokedSerials: serials,
        results: results.map(item => item.status),
      })
    );
  } finally {
    await ds.destroy();
  }
}

main().catch(e => {
  console.error(JSON.stringify({ dialect, ok: false, error: e?.message || String(e) }));
  process.exit(1);
});
