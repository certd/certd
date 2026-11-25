import assert from "node:assert/strict";
import fs from "node:fs";
import crypto, { X509Certificate } from "node:crypto";
import { Encryptor, EncryptService } from "@certd/lib-server";
import { LocalCaService } from "./local-ca-service.js";
import { LocalCaAccessService } from "./local-ca-access-service.js";
import { LocalCaCrlService } from "./local-ca-crl-service.js";
import { LocalCaAcmeService } from "./local-ca-acme-service.js";
import { createCsr, createIntermediateCa, getCertSerialNumber } from "./local-ca-crypto.js";
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
      if (value && value._type === "in") {
        if (!(value._value || []).includes(item[key])) {
          return false;
        }
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
    async update(where: any, set: any) {
      const item = store.get(where.id);
      if (item) {
        Object.assign(item, set);
      }
    },
    create(data: any) {
      return data;
    },
    async delete({ id }: any) {
      const ids = id?._value || [];
      for (const itemId of ids) {
        store.delete(itemId);
      }
    },
    createQueryBuilder() {
      let values: any;
      let params: any;
      return {
        update() {
          return this;
        },
        set(data: any) {
          values = data;
          return this;
        },
        where(_sql: string, data: any) {
          params = data;
          return this;
        },
        async execute() {
          const item = store.get(params?.id);
          if (item && (params?.crlNumber == null || Number(item.crlNumber) === Number(params.crlNumber))) {
            if (typeof values?.crlNumber === "function") {
              item.crlNumber = (Number(item.crlNumber) || 0) + 1;
            } else {
              Object.assign(item, values);
            }
            return { affected: 1 };
          }
          return { affected: 0 };
        },
      };
    },
  } as any;

  function createSimpleRepo(keyField = "id") {
    const map = new Map<any, any>();
    let nextId = 1;
    return {
      async findOne({ where }: any) {
        for (const item of map.values()) {
          if (Object.keys(where || {}).every(key => where[key] === undefined || item[key] === where[key])) {
            return item;
          }
        }
        return null;
      },
      async find({ where }: any = {}) {
        return Array.from(map.values()).filter(item => Object.keys(where || {}).every(key => where[key] === undefined || item[key] === where[key]));
      },
      async save(entity: any) {
        if (entity.id == null) {
          entity.id = nextId++;
        }
        map.set(entity.id, entity);
        return entity;
      },
      create(data: any) {
        return data;
      },
      async update(where: any, set: any) {
        const item = map.get(where.id);
        if (item) {
          Object.assign(item, set);
        }
      },
      async delete(where: any) {
        const value = where.id;
        if (value && value._type === "in") {
          for (const id of value._value || []) {
            map.delete(id);
          }
          return;
        }
        map.delete(value);
      },
      map,
    };
  }
  service.adminRepository = createSimpleRepo() as any;
  service.grantRepository = createSimpleRepo() as any;
  service.acmeEabRepository = createSimpleRepo() as any;
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
  let acmeOrderUpdate: any = null;
  (service as any).acmeOrderRepository = {
    async find() {
      return [];
    },
    async update(where: any, set: any) {
      acmeOrderUpdate = { where, set };
      return { affected: 1 };
    },
    getLastUpdate() {
      return acmeOrderUpdate;
    },
  } as any;
  (service.repository as any).manager = {
    connection: { options: { type: "better-sqlite3" } },
    async transaction(fn: any) {
      return await fn({
        connection: { options: { type: "better-sqlite3" } },
        getRepository: (entity: any) => {
          if (entity?.name === "AcmeEabEntity") {
            return service.acmeEabRepository;
          }
          if (entity?.name === "AcmeOrderEntity") {
            return (service as any).acmeOrderRepository;
          }
          if (entity?.name === "LocalCaGrantEntity") {
            return service.grantRepository;
          }
          if (entity?.name === "LocalCaAdminEntity") {
            return service.adminRepository;
          }
          return service.repository;
        },
      });
    },
  };

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
    async findBySerial(caId: number, serialNumber: string) {
      const key = `${caId}:${String(serialNumber || "").toUpperCase()}`;
      return revocations.get(key) || null;
    },
  } as any;

  // 子服务与facade共享同一套mock依赖：测试中对service.xxx的重新赋值会立即对子服务生效
  const accessService = new LocalCaAccessService();
  const crlService = new LocalCaCrlService();
  const acmeService = new LocalCaAcmeService();
  const sharedKeys = ["repository", "pipelineRepository", "adminRepository", "grantRepository", "acmeEabRepository", "acmeOrderRepository", "encryptService", "certInfoService", "certRevocationService", "sysSettingsService", "providerSync"];
  for (const sub of [accessService, crlService, acmeService]) {
    for (const key of sharedKeys) {
      Object.defineProperty(sub, key, {
        configurable: true,
        get: () => (service as any)[key],
        set: value => {
          (service as any)[key] = value;
        },
      });
    }
  }
  crlService.accessService = accessService;
  acmeService.accessService = accessService;
  acmeService.crlService = crlService;
  service.accessService = accessService;
  service.crlService = crlService;
  service.acmeService = acmeService;
  // 颁发机构同步钩子为best-effort，单测用no-op mock（同步逻辑由local-ca-provider-sync-service.test.ts覆盖）
  service.providerSync = {
    async syncForCa() {},
    async removeForCa() {},
    async onRotated() {},
    async reconcileAll() {},
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
      maxValidityDays: 365,
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
      maxValidityDays: 365,
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
      crlDistributionPoint: `http://127.0.0.1:7001/api/sys/local-ca/crl?id=${root.id}`,
    });
    const imported = await service.importCa({
      userId: 1,
      parentId: root.id,
      name: "Imported Intermediate",
      maxValidityDays: 365,
      certPem: material.certPem,
      privateKeyPem: material.privateKeyPem,
    });
    const info: any = await service.infoSafe({ id: imported.id, userId: 1 });
    assert.equal(info.caType, "intermediate");
    assert.equal(info.parentId, root.id);
    assert.equal(info.keyType, "ecdsa384");
    assert.equal(info.pathLength, 0);
  });

  it("同一管理范围不能重复导入相同CA证书", async () => {
    const { service, store, encryptService } = createService();
    const root = await service.generateCa({
      userId: 1,
      name: "Duplicate Root",
      subject: { CN: "Duplicate Root" },
      keyType: "ecdsa256",
      validityYears: 2,
    });
    const rootEntity = store.get(root.id);
    const material = await createIntermediateCa({
      rootCertPem: rootEntity.certPem,
      rootPrivateKeyPem: encryptService.decrypt(rootEntity.privateKeyEncrypted),
      subject: { CN: "Duplicate Intermediate" },
      keyType: "ecdsa256",
      validityYears: 1,
      crlDistributionPoint: `http://127.0.0.1:7001/api/sys/local-ca/crl?id=${root.id}`,
    });
    await service.importCa({
      userId: 1,
      parentId: root.id,
      name: "Imported Once",
      maxValidityDays: 365,
      certPem: material.certPem,
      privateKeyPem: material.privateKeyPem,
    });
    await assert.rejects(
      () =>
        service.importCa({
          userId: 1,
          parentId: root.id,
          name: "Imported Twice",
          maxValidityDays: 365,
          certPem: material.certPem,
          privateKeyPem: material.privateKeyPem,
        }),
      /无法妥善管理/
    );

    const duplicated = await service.importCa({
      userId: 1,
      parentId: root.id,
      name: "Imported Twice Allowed",
      maxValidityDays: 365,
      certPem: material.certPem,
      privateKeyPem: material.privateKeyPem,
      allowDuplicate: true,
    });
    assert.ok(duplicated.id > 0);
  });

  it("已被上级CA吊销的中间CA不能重新导入", async () => {
    const { service, store, encryptService } = createService();
    const { rootId, id } = await createIssuingCa(service, { name: "Revoked Import CA" });
    const entity = store.get(id);
    const certPem = entity.certPem;
    const privateKeyPem = encryptService.decrypt(entity.privateKeyEncrypted);
    await service.revokeIntermediate({ id, userId: 1 });

    await assert.rejects(
      () =>
        service.importCa({
          userId: 1,
          parentId: rootId,
          name: "Revoked Reimport",
          maxValidityDays: 365,
          certPem,
          privateKeyPem,
        }),
      /已被上级根CA吊销，不能导入/
    );
  });

  it("父CA吊销记录存在时，即使记录未标记revoked也不能签发", async () => {
    const { service, store } = createService();
    const { rootId, id } = await createIssuingCa(service, { name: "Consistency CA" });
    const serialNumber = getCertSerialNumber(store.get(id).certPem);
    await service.certRevocationService.record({ caId: rootId, userId: 1, serialNumber, expiresTime: Date.now() + 86400000 });

    const { csrPem } = await createCsr({ domains: ["consistency.example.com"], keyType: "rsa2048" });
    await assert.rejects(() => service.signCsr({ id, userId: 1, csrPem, validityDays: 30 }), /已被上级根CA吊销/);
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
      maxValidityDays: 365,
      userId: 1,
      name: "Base URL Intermediate",
      subject: { CN: "Base URL Intermediate" },
      keyType: "ecdsa256",
      validityYears: 1,
    });
    const intermediateInfo: any = await service.infoSafe({ id: intermediate.id, userId: 1 });
    assert.equal(intermediateInfo.baseUrl, "https://ca.example.com");

    await assert.rejects(() => service.updateMeta({ id: intermediate.id, userId: 1, baseUrl: "https://pki.example.com/" }), /不可修改/);
    assert.equal(await service.getCaBaseUrl(intermediate.id), "https://ca.example.com");

    const { csrPem } = await createCsr({ domains: ["baseurl.example.com"], keyType: "rsa2048" });
    const signed = await service.signCsr({ id: intermediate.id, userId: 1, csrPem });
    const certText = new x509.X509Certificate(signed.certPem).toString("text");
    assert.match(certText, /https:\/\/ca\.example\.com\/api\/sys\/local-ca\/crl\?id=/);
  });

  it("CA 禁用后 ACME 入口统一拒绝", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "Disabled ACME CA" });
    await service.setAcmeEnabled({ id, userId: 1, enabled: true });
    await service.setDisabled({ id, userId: 1, disabled: true });
    await assert.rejects(() => service.getAcmeCa(id), /已禁用/);
  });

  it("allowedDomains JSON 损坏时拒绝签发", async () => {
    const { service, store } = createService();
    const { id } = await createIssuingCa(service, { name: "Broken Scope CA" });
    store.get(id).allowedDomains = "{not-json";
    await assert.rejects(() => service.issueLeaf({ id, userId: 1, domains: ["broken.example.com"], keyType: "rsa2048" }), /allowedDomains配置损坏/);
  });

  it("中间CA允许域名必须继承且不能扩大根CA范围", async () => {
    const { service } = createService();
    const root = await service.generateCa({
      userId: 1,
      name: "Scope Root CA",
      subject: { CN: "Scope Root CA" },
      keyType: "rsa2048",
      validityYears: 2,
      allowedDomains: ["example.com"],
    });

    await assert.rejects(
      () =>
        service.generateIntermediateCa({
          rootId: root.id,
          maxValidityDays: 365,
          userId: 1,
          name: "Bad Scope Intermediate",
          subject: { CN: "Bad Scope Intermediate" },
          keyType: "rsa2048",
          validityYears: 1,
          allowedDomains: ["evil.com"],
        }),
      /不在该CA允许签发的范围内/
    );

    const child = await service.generateIntermediateCa({
      rootId: root.id,
      maxValidityDays: 365,
      userId: 1,
      name: "Good Scope Intermediate",
      subject: { CN: "Good Scope Intermediate" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    const childInfo: any = await service.infoSafe({ id: child.id, userId: 1 });
    assert.equal(JSON.parse(childInfo.allowedDomains)[0], "example.com");

    await assert.rejects(() => service.updateMeta({ id: root.id, userId: 1, allowedDomains: ["other.com"] }), /子CA「Good Scope Intermediate」的允许域名超出新的根CA范围/);
  });

  it("EAB凭证可以单独禁用和启用", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "EAB Status CA" });
    const bean: any = { id: "eab-1", caId: id, disabled: false, updateTime: null };
    service.acmeEabRepository = {
      async findOne({ where }: any) {
        return where.id === bean.id && where.caId === bean.caId ? bean : null;
      },
      async save(item: any) {
        Object.assign(bean, item);
        return item;
      },
    } as any;

    await service.setAcmeEabDisabled({ caId: id, eabId: "eab-1", userId: 1, disabled: true });
    assert.equal(bean.disabled, true);
    await service.setAcmeEabDisabled({ caId: id, eabId: "eab-1", userId: 1, disabled: false });
    assert.equal(bean.disabled, false);
    await assert.rejects(() => service.setAcmeEabDisabled({ caId: 999, eabId: "eab-1", userId: 1, disabled: true }), /不存在或无访问权限/);
    await assert.rejects(() => service.setAcmeEabDisabled({ caId: id, eabId: "eab-1", userId: 1, disabled: undefined as any }), /disabled必须是布尔值/);
    await assert.rejects(() => service.setAcmeEabDisabled({ caId: id, eabId: "eab-1", userId: 1, disabled: "true" as any }), /disabled必须是布尔值/);
  });

  it("CA不再提供直签开关，直签由EAB特权控制", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "No CA Toggle" });
    await service.setAcmeEnabled({ id, userId: 1, enabled: true });
    const info: any = await service.infoSafe({ id, userId: 1 });
    assert.equal(info.acmeDirectIssue, undefined);
  });

  it("关闭ACME会失效未完成的直签订单（EAB级控制）", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "Disable Direct Issue CA" });
    await service.setAcmeEnabled({ id, userId: 1, enabled: true });
    await service.setAcmeEnabled({ id, userId: 1, enabled: false });

    const last = (service as any).acmeOrderRepository.getLastUpdate();
    assert.equal(last.where.caId, id);
    assert.equal(last.where.directIssue, true);
    assert.equal(last.set.status, "invalid");
    assert.match(last.set.error, /ACME服务已关闭/);
  });

  it("finalize读取CA时在非SQLite数据库加行锁", async () => {
    const { service } = createService();
    let findArgs: any = null;
    const manager: any = {
      connection: { options: { type: "postgres" } },
      getRepository() {
        return {
          async findOne(args: any) {
            findArgs = args;
            return { id: 2, caType: "intermediate", acmeEnabled: true, disabled: false, revoked: false, deleted: false };
          },
        };
      },
    };
    const ca = await service.getAcmeCaForUpdate(2, manager);
    assert.equal(ca.id, 2);
    assert.equal(findArgs.lock.mode, "pessimistic_write");
  });

  it("Base URL 在签发后会锁定，避免历史 CRL 地址失效", async () => {
    const { service } = createService();
    service.sysSettingsService = {
      async getSetting() {
        return { bindUrl: "https://certd.example.com" };
      },
    } as any;
    const { rootId, id } = await createIssuingCa(service, { name: "Locked Base Url CA" });

    const { csrPem } = await createCsr({ domains: ["lock.example.com"], keyType: "rsa2048" });
    await service.signCsr({ id, userId: 1, csrPem, validityDays: 30 });

    await assert.rejects(() => service.updateMeta({ id, userId: 1, baseUrl: "https://new.example.com" }), /不可修改/);
    await assert.rejects(() => service.updateMeta({ id: rootId, userId: 1, baseUrl: "https://new-root.example.com" }), /已用于签发/);
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

  it("禁用参数必须是布尔值，缺失或字符串不能启用CA", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "Boolean Disable CA" });
    await assert.rejects(() => service.setDisabled({ id, userId: 1, disabled: undefined as any }), /disabled必须是布尔值/);
    await assert.rejects(() => service.setDisabled({ id, userId: 1, disabled: "false" as any }), /disabled必须是布尔值/);
    await service.setDisabled({ id, userId: 1, disabled: true });
    assert.equal((await service.infoSafe({ id, userId: 1 })).disabled, true);
  });

  it("禁用CA后拒绝签发", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "Disabled CA" });
    await service.setDisabled({ id, userId: 1, disabled: true });
    const { csrPem } = await createCsr({ domains: ["foo.example.com"], keyType: "rsa2048" });
    await assert.rejects(() => service.signCsr({ id, userId: 1, csrPem }), /已禁用/);
  });

  it("listOptions 返回后端解析后的访问地址", async () => {
    const { service } = createService();
    service.sysSettingsService = {
      async getSetting() {
        return { bindUrl: "https://cert.example.com" };
      },
    } as any;
    const { id } = await createIssuingCa(service, { name: "Base URL CA" });
    const options = await service.listAdminOptions({ adminUserId: 1 });
    const item = options.find((option: any) => option.id === id);
    assert.equal(item.baseUrl, "https://cert.example.com");
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
    const { id } = await createIssuingCa(service, { name: "Expired CRL CA" });
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
    const { id } = await createIssuingCa(service, { name: "Expired Revocation CA" });
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

  it("consumeAcmeEab 使用实体列名并带原子次数条件", async () => {
    const { service } = createService();
    let expression = "";
    let condition = "";
    let whereSql = "";
    service.acmeEabRepository = {
      metadata: {
        findColumnWithPropertyName(name: string) {
          return {
            usedCount: { databaseName: "used_count" },
            maxUses: { databaseName: "max_uses" },
            disabled: { databaseName: "disabled" },
            expiresTime: { databaseName: "expires_time" },
          }[name];
        },
      },
      createQueryBuilder() {
        return {
          update() {
            return this;
          },
          set(values: any) {
            expression = values.usedCount();
            return this;
          },
          where(value: string) {
            whereSql = value;
            return this;
          },
          andWhere(value: string) {
            condition = value;
            whereSql += ` AND ${value}`;
            return this;
          },
          async execute() {
            return { affected: 1 };
          },
        };
      },
    } as any;

    assert.equal(await service.consumeAcmeEab("eab-1"), true);
    assert.equal(expression, "used_count + 1");
    assert.match(condition, /max_uses = 0 OR used_count < max_uses/);
    assert.match(whereSql, /disabled = :disabled/);
    assert.match(whereSql, /expires_time IS NULL OR expires_time > :now/);
  });

  it("禁止导出的CA拒绝导出，但查看公钥仍可用", async () => {
    const { service } = createService();
    const { id } = await service.generateCa({
      userId: 1,
      name: "No Export CA",
      subject: { CN: "No Export CA" },
      keyType: "rsa2048",
      validityYears: 1,
      exportDisabled: true,
    });
    const info: any = await service.infoSafe({ id, userId: 1 });
    assert.equal(info.exportDisabled, true);
    await assert.rejects(() => service.exportCa({ id, userId: 1 }), /已禁止导出/);
    const publicKey = await service.getPublicKey({ id, userId: 1 });
    assert.match(publicKey.pem, /BEGIN PUBLIC KEY/);
  });

  it("中间CA禁用后仍可提供CRL，存量证书可继续校验", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "Retired Intermediate CA" });
    await service.setDisabled({ id, userId: 1, disabled: true });
    const crl = await service.getCrl(id);
    assert.match(crl.pem, /BEGIN X509 CRL/);
  });

  it("吊销后缓存失效，CRL立即包含新序列号", async () => {
    const { service, store } = createService();
    const { id } = await createIssuingCa(service, { name: "Dirty CRL CA" });
    await service.getCrl(id);
    await service.certRevocationService.record({ caId: id, userId: 1, serialNumber: "0A99", expiresTime: Date.now() + 86400000 });
    store.get(id).lastCrlTime = -1;
    const crl = await service.getCrl(id);
    const parsed = new x509.X509Crl(crl.pem);
    assert.ok(parsed.findRevoked("0A99"));
  });

  it("CRL生成期间发生并发吊销时重试并返回最新CRL", async () => {
    const { service, store } = createService();
    const { id } = await createIssuingCa(service, { name: "Concurrent CRL CA" });
    await service.getCrl(id);
    store.get(id).lastCrlTime = -1;

    const serial = "0AC0FFEE00112233445566778899AABB";
    const originalList = service.certRevocationService.listByCa.bind(service.certRevocationService);
    let injected = false;
    let listCalls = 0;
    service.certRevocationService.listByCa = async (caId: number) => {
      listCalls++;
      const snapshot = await originalList(caId);
      if (!injected) {
        // 模拟：本次CRL已读取吊销快照后，另一个请求完成吊销并推进了CRL序号
        injected = true;
        await service.certRevocationService.record({ caId, userId: 1, serialNumber: serial, expiresTime: Date.now() + 86400000 });
        const entity = store.get(caId);
        entity.crlNumber = Number(entity.crlNumber) + 1;
        entity.lastCrlTime = -1;
      }
      return snapshot;
    };

    const crl = await service.getCrl(id);
    assert.ok(listCalls >= 2, "并发冲突后必须重新读取吊销快照");
    assert.ok(new x509.X509Crl(crl.pem).findRevoked(serial), "响应CRL必须包含并发吊销的序列号");
  });

  it("旧CRL生成结果不能覆盖更高CRL Number的缓存", async () => {
    const { service, store } = createService();
    const { id } = await createIssuingCa(service, { name: "CAS Cache CA" });
    const entity = store.get(id);
    entity.crlNumber = 11;
    entity.lastCrlPem = "newer-crl";
    entity.lastCrlTime = 1;

    await (service.crlService as any).storeCrlCache(id, 10, "older-crl");
    assert.equal(entity.lastCrlPem, "newer-crl");
    await (service.crlService as any).storeCrlCache(id, 11, "current-crl");
    assert.equal(entity.lastCrlPem, "current-crl");
  });

  it("CRL Number 持久化单调递增，同一秒也不同", async () => {
    const { service, store } = createService();
    const { id } = await createIssuingCa(service, { name: "CRL Number CA" });
    const first = await service.getCrlInfo({ id, userId: 1 });
    store.get(id).lastCrlPem = null;
    const second = await service.getCrlInfo({ id, userId: 1 });
    assert.ok(Number(second.crlNumber) > Number(first.crlNumber));
  });

  it("Root私钥仅用于签中间CA和导出，不参与在线CRL签名", async () => {
    const { service } = createService();
    const root = await service.generateCa({
      userId: 1,
      name: "Offline Root",
      subject: { CN: "Offline Root" },
      keyType: "rsa2048",
      validityYears: 2,
    });
    await assert.rejects(() => service.getCrl(root.id), /Root CRL尚未生成/);

    const child = await service.generateIntermediateCa({
      rootId: root.id,
      maxValidityDays: 365,
      userId: 1,
      name: "Allowed Intermediate",
      subject: { CN: "Allowed Intermediate" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    assert.ok(child.id);
    const rootCrl = await service.getCrl(root.id);
    assert.match(rootCrl.pem, /BEGIN X509 CRL/);

    const exported = await service.exportCa({ id: root.id, userId: 1 });
    const exportedContent = await fs.promises.readFile(exported.path, "utf8");
    const mode = (await fs.promises.stat(exported.path)).mode & 0o777;
    assert.match(exportedContent, /BEGIN PRIVATE KEY/);
    assert.equal(mode, 0o600);
    await fs.promises.unlink(exported.path);
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
    const content = await fs.promises.readFile(res.path, "utf8");
    assert.match(content, /BEGIN CERTIFICATE/);
    assert.match(content, /BEGIN PRIVATE KEY/);
    await fs.promises.unlink(res.path);
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

  it("吊销中间CA会更新Root CRL并可验证", async () => {
    const { service, store } = createService();
    const { rootId, id } = await createIssuingCa(service, { name: "Revoke Intermediate CA" });
    const serial = (await service.infoSafe({ id, userId: 1 })) as any;
    const intermediateSerial = getCertSerialNumber(serial.certPem);
    const result = await service.revokeIntermediate({ id, userId: 1, reason: "superseded" });
    assert.equal(result.serialNumber, intermediateSerial);
    assert.equal(store.get(id).disabled, true);

    const rootCrl = await service.getCrlInfo({ id: rootId, userId: 1 });
    assert.ok(rootCrl.entries.some((item: any) => item.serialNumber.toUpperCase() === intermediateSerial));
  });

  it("吊销时Root CRL生成失败也保持CA不可签发，并可重试", async () => {
    const { service, store } = createService();
    const { rootId, id } = await createIssuingCa(service, { name: "Fail Closed Intermediate" });
    const originalStore = (service.crlService as any).storeCrlCache;
    (service.crlService as any).storeCrlCache = async () => {
      throw new Error("模拟CRL写入失败");
    };
    await assert.rejects(() => service.revokeIntermediate({ id, userId: 1 }), /模拟CRL写入失败/);
    assert.equal(store.get(id).revoked, true);
    assert.equal(store.get(id).disabled, true);
    await assert.rejects(() => service.issueLeaf({ id, userId: 1, domains: ["x.example.com"], keyType: "rsa2048" }), /已被父CA吊销|已禁用/);

    (service.crlService as any).storeCrlCache = originalStore;
    const retried = await service.revokeIntermediate({ id, userId: 1 });
    assert.ok(retried.crlNumber > 0);
    const rootCrl = await service.getCrlInfo({ id: rootId, userId: 1 });
    assert.ok(rootCrl.entries.some((item: any) => item.serialNumber.toUpperCase() === retried.serialNumber));
  });

  it("吊销中间CA时Root CRL持续写入冲突，保持吊销状态并标记缓存失效", async () => {
    const { service, store } = createService();
    const { rootId, id } = await createIssuingCa(service, { name: "Conflict Intermediate" });
    (service.crlService as any).storeCrlCache = async () => false;

    await assert.rejects(() => service.revokeIntermediate({ id, userId: 1 }), /并发变更/);

    assert.equal(store.get(id).revoked, true);
    assert.equal(store.get(id).disabled, true);
    assert.equal(Number(store.get(rootId).lastCrlTime), -1);
  });

  it("Root CRL先生成序号再读取吊销快照，避免并发漏吊销", async () => {
    const { service } = createService();
    const root = await service.generateCa({
      userId: 1,
      name: "Concurrent Root",
      subject: { CN: "Concurrent Root" },
      keyType: "rsa2048",
      validityYears: 2,
    });
    const sequence: string[] = [];
    const crlService = service.crlService as any;
    const originalNext = crlService.nextCrlNumber;
    const originalEntries = crlService.getRevocationEntries;
    crlService.nextCrlNumber = async function (caId: number) {
      sequence.push("number");
      return await originalNext.call(crlService, caId);
    };
    crlService.getRevocationEntries = async function (caId: number) {
      sequence.push("entries");
      return await originalEntries.call(crlService, caId);
    };

    await service.refreshRootCrl({ id: root.id, userId: 1 });
    assert.deepEqual(sequence, ["number", "entries"]);
  });

  it("Root CRL条件写入冲突时重试，不误报刷新成功", async () => {
    const { service } = createService();
    const root = await service.generateCa({
      userId: 1,
      name: "Retry Root",
      subject: { CN: "Retry Root" },
      keyType: "rsa2048",
      validityYears: 2,
    });
    const originalStore = (service.crlService as any).storeCrlCache.bind(service.crlService);
    let storeCalls = 0;
    (service.crlService as any).storeCrlCache = async (...args: any[]) => {
      storeCalls++;
      return storeCalls === 1 ? false : await originalStore(...args);
    };
    const result = await service.refreshRootCrl({ id: root.id, userId: 1 });
    assert.ok(storeCalls >= 2, "条件写入失败后必须重试");
    const info = await service.getCrlInfo({ id: root.id, userId: 1 });
    assert.equal(Number(info.crlNumber), Number(result.crlNumber));
  });

  it("Root CRL持续写入冲突时返回错误而不是虚报成功", async () => {
    const { service } = createService();
    const root = await service.generateCa({
      userId: 1,
      name: "Conflict Root",
      subject: { CN: "Conflict Root" },
      keyType: "rsa2048",
      validityYears: 2,
    });
    (service.crlService as any).storeCrlCache = async () => false;
    await assert.rejects(() => service.refreshRootCrl({ id: root.id, userId: 1 }), /并发变更/);
  });

  it("创建新中间CA不会丢掉Root CRL中已有的吊销项", async () => {
    const { service } = createService();
    const { rootId, id } = await createIssuingCa(service, { name: "First Intermediate" });
    const firstInfo: any = await service.infoSafe({ id, userId: 1 });
    const firstSerial = getCertSerialNumber(firstInfo.certPem);
    await service.revokeIntermediate({ id, userId: 1, reason: "superseded" });

    await service.generateIntermediateCa({
      rootId,
      userId: 1,
      name: "Second Intermediate",
      subject: { CN: "Second Intermediate" },
      keyType: "rsa2048",
      validityYears: 1,
      maxValidityDays: 365,
    });

    const rootCrl = await service.getCrlInfo({ id: rootId, userId: 1 });
    assert.ok(rootCrl.entries.some((item: any) => item.serialNumber.toUpperCase() === firstSerial));
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

    await assert.rejects(() => service.archiveCa({ id, userId: 1 }), /流水线「内部证书自动化」引用/);
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
    await assert.rejects(() => service.archiveCa({ id, userId: 1 }), /未吊销且未过期/);
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
    await service.archiveCa({ id, userId: 1 });
    assert.equal(store.get(id).deleted, true);
  });

  it("归档Root仍可通过维护接口刷新CRL", async () => {
    const { service, store } = createService();
    const { rootId, id } = await createIssuingCa(service, { name: "Archived Root Child" });
    const childSerial = getCertSerialNumber(store.get(id).certPem);
    await service.revokeIntermediate({ id, userId: 1 });
    await service.archiveCa({ id, userId: 1 });
    await service.setDisabled({ id: rootId, userId: 1, disabled: true });
    await service.archiveCa({ id: rootId, userId: 1 });
    assert.equal(store.get(rootId).deleted, true);

    const res = await service.refreshArchivedRootCrl({ id: rootId, userId: 1 });
    assert.ok(res.crlNumber > 0);
    const crl = await service.getCrl(rootId);
    assert.ok(new x509.X509Crl(crl.pem).findRevoked(childSerial));
    await assert.rejects(() => service.refreshArchivedRootCrl({ id: rootId, userId: 2 }), /不存在或无访问权限/);
  });

  it("关闭ACME会失效未完成直签订单", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "Disable Acme CA" });
    await service.setAcmeEnabled({ id, userId: 1, enabled: true });
    await service.setAcmeEnabled({ id, userId: 1, enabled: false });

    const last = (service as any).acmeOrderRepository.getLastUpdate();
    assert.equal(last.where.caId, id);
    assert.equal(last.where.directIssue, true);
    assert.equal(last.set.status, "invalid");
    assert.match(last.set.error, /ACME服务已关闭/);
    const info: any = await service.infoSafe({ id, userId: 1 });
    assert.equal(info.acmeEnabled, false);
  });

  it("Base URL 拒绝账号密码、查询参数和片段", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "Strict Base Url CA" });
    await assert.rejects(() => service.updateMeta({ id, userId: 1, baseUrl: "https://user:pass@ca.example.com" }), /不能包含用户名或密码/);
    await assert.rejects(() => service.updateMeta({ id, userId: 1, baseUrl: "https://ca.example.com?a=1" }), /不能包含查询参数或片段/);
    await assert.rejects(() => service.updateMeta({ id, userId: 1, baseUrl: "https://ca.example.com#x" }), /不能包含查询参数或片段/);
  });

  it("Base URL 为空时首次签发会固化有效地址", async () => {
    const { service, store } = createService();
    service.sysSettingsService = {
      async getSetting() {
        return { bindUrl: "https://bind.example.com" };
      },
    } as any;
    const { rootId } = await createIssuingCa(service, { name: "Locked Effective Base" });
    assert.equal(store.get(rootId).baseUrl, "https://bind.example.com");
    assert.equal(store.get(rootId).baseUrlLocked, true);
  });

  it("中间CA必须使用有限且不超过父CA的最大签发天数", async () => {
    const { service } = createService();
    const root = await service.generateCa({
      userId: 1,
      name: "Validity Root",
      subject: { CN: "Validity Root" },
      keyType: "ecdsa256",
      validityYears: 2,
      maxValidityDays: 30,
    });
    await assert.rejects(
      () =>
        service.generateIntermediateCa({
          rootId: root.id,
          userId: 1,
          name: "Too Long Intermediate",
          subject: { CN: "Too Long Intermediate" },
          keyType: "ecdsa256",
          validityYears: 1,
          maxValidityDays: 60,
        }),
      /不能超过上级CA/
    );
    const unlimitedRoot = await service.generateCa({
      userId: 1,
      name: "Unlimited Root",
      subject: { CN: "Unlimited Root" },
      keyType: "ecdsa256",
      validityYears: 2,
    });
    await assert.rejects(
      () =>
        service.generateIntermediateCa({
          rootId: unlimitedRoot.id,
          userId: 1,
          name: "Unlimited Intermediate",
          subject: { CN: "Unlimited Intermediate" },
          keyType: "ecdsa256",
          validityYears: 1,
        }),
      /必须设置有限/
    );
  });

  it("ACME三档：legacy缺省标准，显式local生成内部凭证并经getter下发", async () => {
    const { service, store } = createService();
    const { id } = await createIssuingCa(service, { name: "Mode CA" });
    await service.setAcmeEnabled({ id, userId: 1, enabled: true });
    let config = JSON.parse(store.get(id).acmeConfig || "{}");
    assert.equal(config.acmeMode, undefined);
    assert.equal(service.acmeService.resolveAcmeMode(config), "standard");

    await service.setAcmeEnabled({ id, userId: 1, enabled: true, mode: "local" });
    config = JSON.parse(store.get(id).acmeConfig);
    assert.equal(config.acmeMode, "local");
    assert.ok(config.internalToken);

    const safe: any = await service.getUserCa({ id, userId: 1 });
    assert.equal(safe.localAcmeToken, config.internalToken);
    assert.equal(safe.acmeMode, "local");
    assert.equal(safe.acmeConfig, undefined);

    await service.setAcmeEnabled({ id, userId: 1, enabled: true, mode: "standard" });
    const safe2: any = await service.getUserCa({ id, userId: 1 });
    assert.equal(safe2.acmeMode, "standard");
    assert.equal(safe2.localAcmeToken, undefined);
  });

  it("敏感更新会被识别为需要Step-up", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "StepUp CA" });
    assert.equal(await service.requiresStepUpForUpdate({ id, userId: 1, remark: "x" } as any), false);
    assert.equal(await service.requiresStepUpForUpdate({ id, userId: 1, allowedDomains: ["example.com"] }), true);
    assert.equal(await service.requiresStepUpForUpdate({ id, userId: 1, maxValidityDays: 30 }), true);
  });

  it("连续写入失败且缓存过期时不能返回旧CRL", async () => {
    const { service, store, encryptService } = createService();
    const { id } = await createIssuingCa(service, { name: "Expired Crl CA" });
    const caEntity = store.get(id);
    const privateKeyPem = encryptService.decrypt(caEntity.privateKeyEncrypted);
    const signingKey = await crypto.webcrypto.subtle.importKey("pkcs8", x509.PemConverter.decodeFirst(privateKeyPem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const caCert = new x509.X509Certificate(caEntity.certPem);
    const expired = await x509.X509CrlGenerator.create(
      {
        issuer: caCert.subjectName,
        thisUpdate: new Date(Date.now() - 2 * 86400000),
        nextUpdate: new Date(Date.now() - 86400000),
        signingKey,
        signingAlgorithm: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      } as any,
      crypto.webcrypto as any
    );
    caEntity.lastCrlPem = expired
      .toString("pem")
      .replace(/BEGIN CRL/g, "BEGIN X509 CRL")
      .replace(/END CRL/g, "END X509 CRL");
    caEntity.lastCrlTime = Date.now();
    (service.crlService as any).storeCrlCache = async () => false;

    await assert.rejects(() => service.getCrl(id), /没有可用缓存/);
  });

  it("管理员之间通过ACL隔离，操作员不能执行创建管理员专属操作", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "ACL CA" });

    await assert.rejects(() => service.assertAdminCa(id, 2), /无访问权限/);
    await assert.rejects(() => service.addCaAdmin({ id, userId: 1, adminUserId: 2, role: "owner" }), /所有者/);
    await service.addCaAdmin({ id, userId: 1, adminUserId: 2, role: "operator" });
    const access = await service.assertAdminCa(id, 2);
    assert.equal(access.role, "operator");

    await service.updateMeta({ id, userId: 2, remark: "operator updated" });
    await assert.rejects(() => service.exportCa({ id, userId: 2 }), /创建管理员/);
    await assert.rejects(() => service.addGrant({ id, userId: 2, grantUserId: 3 }), /创建管理员/);
    await assert.rejects(() => service.removeCaAdmin({ id, userId: 2, adminUserId: 1 }), /创建管理员/);

    const ownerList = await service.listAdminOptions({ adminUserId: 1 });
    const operatorList = await service.listAdminOptions({ adminUserId: 2 });
    assert.ok(ownerList.some(item => item.id === id));
    assert.ok(operatorList.some(item => item.id === id));
    assert.equal((await service.listAdminOptions({ adminUserId: 3 })).length, 0);
  });

  it("仅中间CA可授权，用户模式与项目模式互斥", async () => {
    const { service } = createService();
    const { rootId, id } = await createIssuingCa(service, { name: "Grant CA" });

    await assert.rejects(() => service.addGrant({ id: rootId, userId: 1, grantUserId: 2 }), /中间CA/);
    // 用户模式：授权用户2，其全部项目可用
    const userGrant = await service.addGrant({ id, userId: 1, grantUserId: 2 });
    assert.equal(userGrant.userId, 2);
    assert.equal(userGrant.projectId, 0);
    assert.deepEqual((await service.listOptions({ userId: 2, projectId: 10 })).map(item => item.id), [id]);
    assert.deepEqual((await service.listOptions({ userId: 2, projectId: 11 })).map(item => item.id), [id]);
    assert.equal((await service.listOptions({ userId: 3, projectId: 10 })).length, 0);

    // 项目模式：授权项目10，项目内全部用户可用（userId=0）
    const projGrant = await service.addGrant({ id, userId: 1, grantProjectId: 10 });
    assert.equal(projGrant.userId, 0);
    assert.equal(projGrant.projectId, 10);
    assert.deepEqual((await service.listOptions({ userId: 9, projectId: 10 })).map(item => item.id), [id]);
    assert.equal((await service.listOptions({ userId: 9, projectId: 11 })).length, 0);

    const { csrPem } = await createCsr({ domains: ["grant.example.com"], keyType: "rsa2048" });
    await assert.rejects(() => service.signCsr({ id, userId: 9, projectId: 11, csrPem }), /无访问权限/);
    const signed = await service.signCsr({ id, userId: 9, projectId: 10, csrPem });
    assert.ok(signed.certPem.includes("BEGIN CERTIFICATE"));

    await service.removeGrant({ id, userId: 1, grantId: userGrant.id });
    assert.equal((await service.listOptions({ userId: 2, projectId: 99 })).length, 0);
  });

  it("EAB可绑定用户授权，并固化用户与项目归属", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "EAB Grant CA" });
    await service.setAcmeEnabled({ id, userId: 1, enabled: true });
    const grant = await service.addGrant({ id, userId: 1, grantUserId: 5 });

    const eab = await service.createAcmeEab({
      caId: id,
      userId: 1,
      name: "bound eab",
      grantId: grant.id,
      maxUses: 1,
    });
    assert.equal(eab.grantId, grant.id);
    assert.equal(eab.userId, 5);
    assert.ok(!eab.projectId);

    const stored: any = await (service.acmeEabRepository as any).findOne({ where: { kid: eab.kid } });
    assert.equal(stored.userId, 5);
    assert.ok(!stored.projectId);
    assert.equal(stored.grantId, grant.id);
  });

  it("根CA不能授权、不能签发叶子，也不能创建EAB", async () => {
    const { service } = createService();
    const root = await service.generateCa({
      userId: 1,
      name: "Root Only CA",
      subject: { CN: "Root Only CA" },
      keyType: "rsa2048",
      validityYears: 2,
    });
    await assert.rejects(() => service.addGrant({ id: root.id, userId: 1, grantUserId: 2 }), /中间CA/);
    await assert.rejects(() => service.createAcmeEab({ caId: root.id, userId: 1, name: "root eab" }), /中间CA/);

    const { csrPem } = await createCsr({ domains: ["root.example.com"], keyType: "rsa2048" });
    await assert.rejects(() => service.signCsr({ id: root.id, userId: 1, csrPem }), /根CA不能直接签发/);
  });

  it("企业模式项目流水线(userId=-1)按项目授权使用中间CA", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "Enterprise Grant CA" });
    await service.addGrant({ id, userId: 1, grantUserId: 2, grantProjectId: 10 });

    const options = await service.listOptions({ userId: -1, projectId: 10 });
    assert.deepEqual(
      options.map(item => item.id),
      [id]
    );
    assert.equal((await service.listOptions({ userId: -1, projectId: 11 })).length, 0);

    const { csrPem } = await createCsr({ domains: ["enterprise.example.com"], keyType: "rsa2048" });
    await assert.rejects(() => service.signCsr({ id, userId: -1, projectId: 11, csrPem }), /无访问权限/);
    const signed = await service.signCsr({ id, userId: -1, projectId: 10, csrPem });
    assert.ok(signed.certPem.includes("BEGIN CERTIFICATE"));
  });
  it("轮换保留原CA有效期/ACME配置，旧CA自动禁用并指向新CA", async () => {
    const { service } = createService();
    const { id } = await createIssuingCa(service, { name: "Rotate CA" });
    await service.setAcmeEnabled({ id, userId: 1, enabled: true });
    const old: any = await service.infoSafe({ id, userId: 1 });
    const res = await service.rotateIntermediateCa({ id, userId: 1 });
    const updatedOld: any = await service.infoSafe({ id, userId: 1 });
    const newCa: any = await service.infoSafe({ id: res.id, userId: 1 });
    assert.equal(updatedOld.disabled, true);
    assert.equal(updatedOld.rotatedToId, res.id);
    assert.equal(newCa.acmeEnabled, true);
    const oldYears = Math.round((Number(old.notAfter) - Number(old.notBefore)) / (365 * 86400000));
    const newYears = Math.round((Number(newCa.notAfter) - Number(newCa.notBefore)) / (365 * 86400000));
    assert.equal(newYears, oldYears);
    const effective: any = await service.getAcmeCa(id);
    assert.equal(effective.id, res.id);
  });

});
