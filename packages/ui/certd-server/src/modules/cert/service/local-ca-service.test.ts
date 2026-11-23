import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { Encryptor, EncryptService } from "@certd/lib-server";
import { LocalCaService } from "./local-ca-service.js";
import { createCsr, createIntermediateCa } from "./local-ca-crypto.js";
// @ts-ignore
import * as x509 from "@peculiar/x509";

function createService() {
  const store = new Map<number, any>();
  let nextId = 1;
  function matches(item: any, where: any) {
    for (const key of Object.keys(where || {})) {
      const value = where[key];
      if (value === undefined) {
        continue;
      }
      if (item[key] !== value) {
        return false;
      }
    }
    return true;
  }

  const service = new LocalCaService();
  service.repository = {
    async findOne({ where }: any) {
      for (const item of store.values()) {
        if (matches(item, where)) {
          return item;
        }
      }
      return null;
    },
    async find({ where }: any) {
      return Array.from(store.values()).filter(item => matches(item, where));
    },
    async save(entity: any) {
      if (!entity.id) {
        entity.id = nextId++;
      }
      store.set(entity.id, entity);
      return entity;
    },
    async create(data: any) {
      return data;
    },
    async delete({ id }: any) {
      const ids = id?._value || [];
      for (const itemId of ids) {
        store.delete(itemId);
      }
    },
  } as any;

  const encryptService = new EncryptService();
  encryptService.encryptor = new Encryptor(Buffer.alloc(32, 1).toString("base64"));
  service.encryptService = encryptService;
  service.certInfoService = {
    async find() {
      return [];
    },
    async applyLocalRevocation(req: any) {
      await service.certRevocationService.record(req);
    },
  } as any;
  service.pipelineRepository = {
    async find() {
      return [];
    },
  } as any;

  const revocations = new Map<string, any>();
  service.certRevocationService = {
    async record(req: any) {
      const key = `${req.caId}:${String(req.serialNumber).toUpperCase()}`;
      if (!revocations.has(key)) {
        revocations.set(key, { ...req, serialNumber: String(req.serialNumber).toUpperCase() });
      }
      return revocations.get(key);
    },
    async listByCa(caId: number) {
      return [...revocations.values()].filter(item => item.caId === caId);
    },
  } as any;

  return { service, store, encryptService, revocations };
}

describe("LocalCaService", () => {
  async function createIssuingCa(service: LocalCaService, opts: { name: string; allowedDomains?: string[] }) {
    const root = await service.generateCa({
      userId: 1,
      name: `${opts.name} Root`,
      subject: { CN: `${opts.name} Root` },
      keyType: "rsa2048",
      validityYears: 2,
      allowedDomains: opts.allowedDomains,
    });
    const intermediate = await service.generateIntermediateCa({
      rootId: root.id,
      userId: 1,
      name: opts.name,
      subject: { CN: opts.name },
      keyType: "rsa2048",
      validityYears: 1,
      allowedDomains: opts.allowedDomains,
    });
    return { rootId: root.id, id: intermediate.id };
  }

  it("生成CA时私钥加密存储，接口返回脱敏", async () => {
    const { service, store, encryptService } = createService();
    const { id } = await service.generateCa({
      userId: 1,
      name: "Test Root CA",
      subject: { CN: "Test Root CA" },
      keyType: "rsa2048",
      validityYears: 1,
    });

    const entity = store.get(id);
    assert.ok(entity);
    assert.match(entity.privateKeyEncrypted, /^[0-9a-f]+:[0-9a-f]+$/);
    assert.equal(entity.privateKeyHash.length, 64);
    const plain = encryptService.decrypt(entity.privateKeyEncrypted);
    assert.match(plain, /BEGIN PRIVATE KEY/);
    assert.notEqual(entity.privateKeyEncrypted, plain);

    const info: any = await service.infoSafe({ id, userId: 1 });
    assert.equal(info.name, "Test Root CA");
    assert.equal(info.privateKeyEncrypted, undefined);
    assert.equal(info.privateKeyHash, undefined);
  });

  it("创建中间CA并记录父子关系与 pathLength", async () => {
    const { service } = createService();
    const root = await service.generateCa({
      userId: 1,
      name: "Hierarchy Root",
      subject: { CN: "Hierarchy Root" },
      keyType: "rsa2048",
      validityYears: 2,
    });
    const intermediate = await service.generateIntermediateCa({
      rootId: root.id,
      userId: 1,
      name: "Hierarchy Intermediate",
      subject: { CN: "Hierarchy Intermediate" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    const rootInfo: any = await service.infoSafe({ id: root.id, userId: 1 });
    const intermediateInfo: any = await service.infoSafe({ id: intermediate.id, userId: 1 });
    assert.equal(rootInfo.caType, "root");
    assert.equal(rootInfo.pathLength, 1);
    assert.equal(intermediateInfo.caType, "intermediate");
    assert.equal(intermediateInfo.parentId, root.id);
    assert.equal(intermediateInfo.pathLength, 0);
    assert.equal(intermediateInfo.parentName, undefined);
  });

  it("可导入中间CA并绑定上级根CA", async () => {
    const { service, store, encryptService } = createService();
    const root = await service.generateCa({
      userId: 1,
      name: "Import Root",
      subject: { CN: "Import Root" },
      keyType: "ecdsa256",
      validityYears: 2,
    });
    const rootEntity = store.get(root.id);
    const rootKey = encryptService.decrypt(rootEntity.privateKeyEncrypted);
    const material = await createIntermediateCa({
      rootCertPem: rootEntity.certPem,
      rootPrivateKeyPem: rootKey,
      subject: { CN: "Imported Intermediate" },
      keyType: "ecdsa384",
      validityYears: 1,
    });
    const imported = await service.importCa({
      userId: 1,
      parentId: root.id,
      name: "Imported Intermediate",
      certPem: material.certPem,
      privateKeyPem: material.privateKeyPem,
    });
    const info: any = await service.infoSafe({ id: imported.id, userId: 1 });
    assert.equal(info.caType, "intermediate");
    assert.equal(info.parentId, root.id);
    assert.equal(info.keyType, "ecdsa384");
    assert.equal(info.pathLength, 0);
  });

  it("CA 级 Base URL 可保存、继承和修改", async () => {
    const { service } = createService();
    const root = await service.generateCa({
      userId: 1,
      name: "Base URL Root",
      subject: { CN: "Base URL Root" },
      keyType: "ecdsa256",
      validityYears: 2,
      baseUrl: "https://ca.example.com/",
    });
    const rootInfo: any = await service.infoSafe({ id: root.id, userId: 1 });
    assert.equal(rootInfo.baseUrl, "https://ca.example.com");
    assert.equal(await service.getCaBaseUrl(root.id), "https://ca.example.com");

    const intermediate = await service.generateIntermediateCa({
      rootId: root.id,
      userId: 1,
      name: "Base URL Intermediate",
      subject: { CN: "Base URL Intermediate" },
      keyType: "ecdsa256",
      validityYears: 1,
    });
    const intermediateInfo: any = await service.infoSafe({ id: intermediate.id, userId: 1 });
    assert.equal(intermediateInfo.baseUrl, "https://ca.example.com");

    await service.updateMeta({ id: intermediate.id, userId: 1, baseUrl: "https://pki.example.com/" });
    assert.equal(await service.getCaBaseUrl(intermediate.id), "https://pki.example.com");

    const { csrPem } = await createCsr({ domains: ["baseurl.example.com"], keyType: "rsa2048" });
    const signed = await service.signCsr({ id: intermediate.id, userId: 1, csrPem });
    const certText = new x509.X509Certificate(signed.certPem).toString("text");
    assert.match(certText, /https:\/\/pki\.example\.com\/api\/cert\/local-ca\/crl\?id=/);
  });

  it("EAB直签只能为已启用ACME的中间CA开启", async () => {
    const { service } = createService();
    const { rootId, id } = await createIssuingCa(service, { name: "Direct Issue CA" });

    await assert.rejects(() => service.updateMeta({ id, userId: 1, acmeDirectIssue: true }), /请先启用该中间CA的ACME服务/);
    await assert.rejects(() => service.updateMeta({ id: rootId, userId: 1, acmeDirectIssue: true }), /只有中间CA可以开启EAB直签/);

    await service.setAcmeEnabled({ id, userId: 1, enabled: true });
    await service.updateMeta({ id, userId: 1, acmeDirectIssue: true });
    const info: any = await service.infoSafe({ id, userId: 1 });
    assert.equal(info.acmeDirectIssue, true);

    await service.updateMeta({ id, userId: 1, acmeDirectIssue: false });
    const updated: any = await service.infoSafe({ id, userId: 1 });
    assert.equal(updated.acmeDirectIssue, false);
  });

  it("signCsr 按CA策略签发并拒绝越界域名", async () => {
    const { service } = createService();
    service.sysSettingsService = {
      async getSetting() {
        return { bindUrl: "https://certd.example.com/" };
      },
    } as any;
    const { rootId, id } = await createIssuingCa(service, { name: "Restricted CA", allowedDomains: ["example.com"] });

    const { csrPem } = await createCsr({ domains: ["foo.example.com"], keyType: "rsa2048" });
    await assert.rejects(() => service.signCsr({ id: rootId, userId: 1, csrPem, validityDays: 30 }), /中间CA/);
    const signed = await service.signCsr({ id, userId: 1, csrPem, validityDays: 30 });
    const leaf = new X509Certificate(signed.certPem);
    const ca = new X509Certificate(signed.chainPem);
    assert.equal(leaf.verify(ca.publicKey), true);
    assert.equal(signed.fullchainPem.split("BEGIN CERTIFICATE").length - 1, 2);
    const x509Leaf = new x509.X509Certificate(signed.certPem);
    assert.ok(
      x509Leaf.extensions.find(ext => ext.type === "2.5.29.31"),
      "证书应带CRL分发点"
    );

    const evil = await createCsr({ domains: ["evil.example.net"], keyType: "rsa2048" });
    await assert.rejects(() => service.signCsr({ id, userId: 1, csrPem: evil.csrPem }), /不在该CA允许签发的范围内/);
  });

  it("禁用CA后拒绝签发", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "Disabled CA" });
    await service.setDisabled({ id, userId: 1, disabled: true });
    const { csrPem } = await createCsr({ domains: ["foo.example.com"], keyType: "rsa2048" });
    await assert.rejects(() => service.signCsr({ id, userId: 1, csrPem }), /已禁用/);
  });

  it("getCrl 包含该CA已吊销证书的序列号", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "CRL CA" });
    const { csrPem } = await createCsr({ domains: ["crl.example.com"], keyType: "rsa2048" });
    const signed = await service.signCsr({ id, userId: 1, csrPem });
    service.certRevocationService = {
      async listByCa() {
        return [{ serialNumber: signed.serialNumber, revokedTime: Date.now() - 1000, reason: "unspecified" }];
      },
    } as any;

    const crl = await service.getCrl(id);
    const parsed = new x509.X509Crl(crl.pem);
    assert.ok(parsed.findRevoked(signed.serialNumber));
    assert.match(crl.pem, /BEGIN X509 CRL/);
    const info = await service.getCrlInfo({ id, userId: 1 });
    assert.equal(info.entries.length, 1);
    assert.ok(info.issuer);
  });

  it("getCrl 会清理已过期的吊销条目", async () => {
    const { service } = createService();
    const { id } = await service.generateCa({
      userId: 1,
      name: "Expired CRL CA",
      subject: { CN: "Expired CRL CA" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    service.certRevocationService = {
      async listByCa() {
        return [
          { serialNumber: "0ABBCCDDEEFF00112233445566778899", revokedTime: Date.now(), expiresTime: Date.now() + 86400000, reason: "unspecified" },
          { serialNumber: "0BAABBCCDDEEFF00112233445566778899", revokedTime: Date.now(), expiresTime: Date.now() - 86400000, reason: "unspecified" },
        ];
      },
    } as any;

    const crl = await service.getCrl(id);
    const parsed = new x509.X509Crl(crl.pem);
    assert.ok(parsed.findRevoked("0ABBCCDDEEFF00112233445566778899"));
    assert.equal(parsed.findRevoked("0BAABBCCDDEEFF00112233445566778899"), null);
  });

  it("过期吊销记录不再进入 CRL，但吊销表记录仍保留", async () => {
    const { service, revocations } = createService();
    const { id } = await service.generateCa({
      userId: 1,
      name: "Expired Revocation CA",
      subject: { CN: "Expired Revocation CA" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    const now = Date.now();
    await service.certRevocationService.record({ caId: id, userId: 1, serialNumber: "0A01", expiresTime: now + 86400000 });
    await service.certRevocationService.record({ caId: id, userId: 1, serialNumber: "0A02", expiresTime: now - 86400000 });

    const crl = await service.getCrl(id);
    const parsed = new x509.X509Crl(crl.pem);
    assert.ok(parsed.findRevoked("0A01"));
    assert.equal(parsed.findRevoked("0A02"), null);
    assert.equal(revocations.size, 2);
    assert.equal((await service.certRevocationService.listByCa(id)).length, 2);
  });

  it("exportCa 返回证书和私钥", async () => {
    const { service } = createService();
    const { id } = await service.generateCa({
      userId: 1,
      name: "Export CA",
      subject: { CN: "Export CA" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    const res = await service.exportCa({ id, userId: 1 });
    assert.match(res.filename, /local-ca-/);
    assert.match(res.content, /BEGIN CERTIFICATE/);
    assert.match(res.content, /BEGIN PRIVATE KEY/);
    const publicKey = await service.getPublicKey({ id, userId: 1 });
    assert.match(publicKey.pem, /BEGIN PUBLIC KEY/);
  });

  it("listIssuedCerts 与 revokeIssuedCert 只处理该CA的证书", async () => {
    const { service, revocations } = createService();
    const { id } = await service.generateCa({
      userId: 1,
      name: "Issued CA",
      subject: { CN: "Issued CA" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    service.certInfoService = {
      async find() {
        return [
          {
            id: 9,
            domain: "a.example.com",
            domains: "a.example.com",
            serialNumber: "ABC",
            status: "active",
            effectiveTime: 1,
            expiresTime: 2,
            applyTime: 3,
            fromType: "pipeline",
          },
        ];
      },
      async findOne({ where }: any) {
        assert.equal(where.id, 9);
        return { id: 9, localCaId: id, status: "active", serialNumber: "ABC", expiresTime: 2 };
      },
      async applyLocalRevocation(req: any) {
        await service.certRevocationService.record(req);
      },
    } as any;

    const list = await service.listIssuedCerts({ id, userId: 1 });
    assert.equal(list.length, 1);
    assert.equal(list[0].serialNumber, "ABC");
    await service.revokeIssuedCert({ id, userId: 1, certId: 9 });
    assert.equal(revocations.get(`${id}:ABC`).caId, id);
  });

  it("根CA签发列表包含下级中间CA", async () => {
    const { service } = createService();
    const { rootId } = await createIssuingCa(service, { name: "Branch CA" });
    service.certInfoService = {
      async find() {
        return [];
      },
    } as any;
    const list = await service.listIssuedCerts({ id: rootId, userId: 1 });
    assert.equal(list.length, 1);
    assert.equal(list[0].type, "ca");
    assert.equal(list[0].caType, "intermediate");
    assert.ok(list[0].serialNumber);
  });

  it("被流水线引用的CA不能删除", async () => {
    const { service } = createService();
    const { id } = await service.generateCa({
      userId: 1,
      name: "Pipeline CA",
      subject: { CN: "Pipeline CA" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    service.pipelineRepository = {
      async find() {
        return [
          {
            id: 5,
            title: "内部证书自动化",
            content: JSON.stringify({
              stages: [{ tasks: [{ steps: [{ type: "CertApplyLocalCa", input: { caId: id } }] }] }],
            }),
          },
        ];
      },
    } as any;

    await assert.rejects(() => service.deleteCa({ id, userId: 1 }), /流水线「内部证书自动化」引用/);
  });

  it("跨用户不可访问，已签发证书的CA不能删除", async () => {
    const { service } = createService();
    const { id } = await service.generateCa({
      userId: 1,
      name: "Owned CA",
      subject: { CN: "Owned CA" },
      keyType: "rsa2048",
      validityYears: 1,
    });

    await assert.rejects(() => service.infoSafe({ id, userId: 2 }), /不存在或无访问权限/);

    service.certInfoService = {
      async find() {
        return [{ id: 99, status: "active", expiresTime: Date.now() + 86400000 }];
      },
    } as any;
    await service.setDisabled({ id, userId: 1, disabled: true });
    await assert.rejects(() => service.deleteCa({ id, userId: 1 }), /未吊销且未过期/);
  });

  it("禁用且所有证书已吊销后允许删除CA", async () => {
    const { service, store } = createService();
    const { id } = await service.generateCa({
      userId: 1,
      name: "Deletable CA",
      subject: { CN: "Deletable CA" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    await service.setDisabled({ id, userId: 1, disabled: true });
    service.certInfoService = {
      async find() {
        return [{ id: 99, status: "revoked", expiresTime: Date.now() + 86400000 }];
      },
    } as any;
    await service.deleteCa({ id, userId: 1 });
    assert.equal(store.has(id), false);
  });
});
