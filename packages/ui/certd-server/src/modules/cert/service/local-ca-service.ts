import crypto from "node:crypto";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { EntityManager, In, Like, Repository } from "typeorm";
import { BaseService, EncryptService, PageReq, SysInstallInfo, SysSettingsService, ValidateException } from "@certd/lib-server";
import { LocalCaEntity } from "../entity/local-ca.js";
import { AcmeEabEntity } from "../entity/acme-server.js";
import { CertInfoService } from "../../monitor/service/cert-info-service.js";
import { CertRevocationService } from "./cert-revocation-service.js";
import { CertStatus } from "../../monitor/entity/cert-info.js";
import { PipelineEntity } from "../../pipeline/entity/pipeline.js";
import { randomId } from "./acme-jws.js";
import {
  createCrl,
  createIntermediateCa,
  createRootCa,
  getBasicConstraints,
  getCertSerialNumber,
  getCrlInfo as parseCrlInfo,
  getPublicKeyPem,
  isSelfSignedCa,
  issueLeafCertificate,
  LocalCaKeyType,
  LocalCaSubject,
  LocalCaUsage,
  signCsr,
  sha256Hex,
  validateImportedIntermediateCa,
  validateImportedRootCa,
} from "./local-ca-crypto.js";

function randomEabHmacKey() {
  // RFC 8555 EAB HMAC key：统一使用无填充的 base64url
  return crypto.randomBytes(32).toString("base64url");
}

function normalizeBaseUrl(value?: string) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (!/^https?:\/\//i.test(text)) {
    throw new ValidateException("Base URL 必须以 http:// 或 https:// 开头");
  }
  return text.replace(/\/+$/, "");
}

export type LocalCaScope = {
  id: number;
  userId: number;
  projectId?: number;
};

export type LocalCaGenerateReq = {
  userId: number;
  projectId?: number;
  name: string;
  subject: LocalCaSubject;
  keyType?: LocalCaKeyType;
  validityYears?: number;
  usage?: LocalCaUsage;
  allowedDomains?: string[];
  maxValidityDays?: number;
  baseUrl?: string;
  remark?: string;
};

export type LocalCaIntermediateReq = Omit<LocalCaScope, "id"> & {
  rootId: number;
  name: string;
  subject: LocalCaSubject;
  keyType?: LocalCaKeyType;
  validityYears?: number;
  usage?: LocalCaUsage;
  allowedDomains?: string[];
  maxValidityDays?: number;
  baseUrl?: string;
  remark?: string;
};

export type LocalCaImportReq = {
  userId: number;
  projectId?: number;
  parentId?: number;
  name: string;
  certPem: string;
  privateKeyPem: string;
  usage?: LocalCaUsage;
  allowedDomains?: string[];
  maxValidityDays?: number;
  baseUrl?: string;
  remark?: string;
};

export type LocalCaIssueReq = LocalCaScope & {
  domains: string[];
  keyType?: LocalCaKeyType;
  validityDays?: number;
  usage?: LocalCaUsage;
};

export type LocalCaSignCsrReq = LocalCaScope & {
  csrPem: string;
  validityDays?: number;
  usage?: LocalCaUsage;
};

export type LocalCaSafe = Omit<LocalCaEntity, "privateKeyEncrypted" | "privateKeyHash">;

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class LocalCaService extends BaseService<LocalCaEntity> {
  @InjectEntityModel(LocalCaEntity)
  repository: Repository<LocalCaEntity>;

  @InjectEntityModel(PipelineEntity)
  pipelineRepository: Repository<PipelineEntity>;

  @InjectEntityModel(AcmeEabEntity)
  acmeEabRepository: Repository<AcmeEabEntity>;

  @Inject()
  encryptService: EncryptService;

  @Inject()
  certInfoService: CertInfoService;

  @Inject()
  certRevocationService: CertRevocationService;

  @Inject()
  sysSettingsService: SysSettingsService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async page(pageReq: PageReq<LocalCaEntity>) {
    const { query = {}, page } = pageReq;
    for (const key of Object.keys(query)) {
      if ((query as any)[key] == null) {
        delete (query as any)[key];
      }
    }
    if ((page as any).offset == null) {
      (page as any).offset = 0;
    }
    if ((page as any).limit == null) {
      (page as any).limit = 20;
    }
    const qb = this.repository.createQueryBuilder("main");
    if (Object.keys(query).length > 0) {
      qb.where(query);
    }
    if (pageReq.buildQuery) {
      pageReq.buildQuery(qb);
    }
    // 根CA按根分组；根在前，中间CA紧跟其父级
    qb.addOrderBy("CASE WHEN main.parent_id IS NULL THEN main.id ELSE main.parent_id END", "DESC");
    qb.addOrderBy("CASE WHEN main.parent_id IS NULL THEN 0 ELSE 1 END", "ASC");
    qb.addOrderBy("main.id", "ASC");
    qb.offset((page as any).offset).limit((page as any).limit);
    const records = await qb.getMany();
    const total = await qb.getCount();
    for (const item of records) {
      const safe = item as any;
      delete safe.privateKeyEncrypted;
      delete safe.privateKeyHash;
    }
    await this.attachParentNames(records as any[]);
    return {
      records,
      total,
      offset: (page as any).offset,
      limit: (page as any).limit,
    };
  }

  async listSafe(req: { userId: number; projectId?: number; searchKey?: string }) {
    const owner = this.buildUserProjectQuery(req.userId, req.projectId);
    const list = await this.find({
      where: owner,
      order: { id: "DESC" },
    });
    const searchKey = String(req.searchKey || "")
      .trim()
      .toLowerCase();
    const safeList = list
      .filter(item => {
        if (!searchKey) {
          return true;
        }
        return item.name.toLowerCase().includes(searchKey) || item.subjectCn.toLowerCase().includes(searchKey);
      })
      .map(item => this.toSafe(item));
    await this.attachParentNames(safeList as any[]);
    return safeList;
  }

  private async attachParentNames(list: any[]) {
    const parentIds = [...new Set(list.map(item => item.parentId).filter(id => id != null))];
    if (parentIds.length === 0) {
      return list;
    }
    const parents = await this.repository.find({
      where: { id: In(parentIds) },
      select: { id: true, name: true, subjectCn: true },
    });
    const nameMap = new Map(parents.map(item => [item.id, item.name]));
    for (const item of list) {
      item.parentName = item.parentId != null ? nameMap.get(item.parentId) || "" : "";
      item.caPath = item.parentName ? `${item.parentName} / ${item.name}` : item.name;
      item.level = item.parentId != null ? 1 : 0;
    }
    return list;
  }

  async infoSafe(req: LocalCaScope) {
    return this.toSafe(await this.getOwnedCa(req));
  }

  async listOptions(req: { userId: number; projectId?: number; searchKey?: string }) {
    const list = await this.listSafe(req);
    return list.map(item => ({
      id: item.id,
      name: item.name,
      subjectCn: item.subjectCn,
      caType: item.caType,
      parentId: item.parentId,
      acmeEnabled: item.acmeEnabled,
      disabled: item.disabled,
      notAfter: item.notAfter,
    }));
  }

  async getOptionsByIds(req: { ids: number[]; userId: number; projectId?: number }) {
    const ids = this.filterIds(req.ids || []);
    if (ids.length === 0) {
      return [];
    }
    const owner = this.buildUserProjectQuery(req.userId, req.projectId);
    const list = await this.find({
      where: {
        id: In(ids),
        ...owner,
      },
    });
    return list.map(item => ({
      id: item.id,
      name: item.name,
      subjectCn: item.subjectCn,
      caType: item.caType,
      parentId: item.parentId,
      acmeEnabled: item.acmeEnabled,
      disabled: item.disabled,
      notAfter: item.notAfter,
    }));
  }

  async generateCa(req: LocalCaGenerateReq) {
    await this.assertNameAvailable(req);
    const keyType = req.keyType || "rsa2048";
    const material = await createRootCa({
      subject: req.subject,
      keyType,
      validityYears: req.validityYears || 10,
    });
    const bean = new LocalCaEntity();
    bean.userId = req.userId;
    bean.projectId = req.projectId;
    bean.name = req.name.trim();
    bean.source = "generated";
    bean.caType = "root";
    bean.parentId = null;
    bean.keyType = keyType;
    bean.keySize = material.keySize;
    bean.hashAlgorithm = "SHA256";
    bean.subject = JSON.stringify(material.subject);
    bean.subjectCn = material.subjectCn;
    bean.certPem = material.certPem;
    bean.privateKeyEncrypted = this.encryptService.encrypt(material.privateKeyPem);
    bean.privateKeyHash = sha256Hex(material.privateKeyPem);
    bean.keyEncryptVersion = "1";
    bean.fingerprintSha256 = material.fingerprintSha256;
    bean.notBefore = material.notBefore;
    bean.notAfter = material.notAfter;
    bean.usage = req.usage || "server";
    bean.allowedDomains = req.allowedDomains?.length ? JSON.stringify(req.allowedDomains) : null;
    bean.maxValidityDays = req.maxValidityDays || 0;
    bean.acmeEnabled = false;
    bean.acmeDirectIssue = false;
    bean.acmeConfig = null;
    bean.baseUrl = normalizeBaseUrl(req.baseUrl);
    bean.pathLength = 1;
    bean.disabled = false;
    bean.remark = req.remark || "";
    const res = await this.add(bean);
    return { id: res.id };
  }

  async generateIntermediateCa(req: LocalCaIntermediateReq) {
    await this.assertNameAvailable(req);
    const root = await this.getOwnedCa({ id: req.rootId, userId: req.userId, projectId: req.projectId });
    if (root.caType !== "root") {
      throw new ValidateException("只有根CA可以签发中间CA");
    }
    if (root.disabled) {
      throw new ValidateException("根CA已禁用，不能签发中间CA");
    }
    const rootPrivateKey = this.decryptCaPrivateKey(root);
    const material = await createIntermediateCa({
      rootCertPem: root.certPem,
      rootPrivateKeyPem: rootPrivateKey,
      subject: req.subject,
      keyType: req.keyType,
      validityYears: req.validityYears,
    });
    const bean = new LocalCaEntity();
    bean.userId = req.userId;
    bean.projectId = req.projectId;
    bean.name = req.name.trim();
    bean.source = "generated";
    bean.caType = "intermediate";
    bean.parentId = root.id;
    bean.keyType = material.keyType || "rsa2048";
    bean.keySize = material.keySize;
    bean.hashAlgorithm = "SHA256";
    bean.subject = JSON.stringify(material.subject);
    bean.subjectCn = material.subjectCn;
    bean.certPem = material.certPem;
    bean.privateKeyEncrypted = this.encryptService.encrypt(material.privateKeyPem);
    bean.privateKeyHash = sha256Hex(material.privateKeyPem);
    bean.keyEncryptVersion = "1";
    bean.fingerprintSha256 = material.fingerprintSha256;
    bean.notBefore = material.notBefore;
    bean.notAfter = material.notAfter;
    bean.usage = req.usage || root.usage;
    bean.allowedDomains = req.allowedDomains?.length ? JSON.stringify(req.allowedDomains) : root.allowedDomains;
    bean.maxValidityDays = req.maxValidityDays ?? root.maxValidityDays;
    bean.acmeEnabled = false;
    bean.acmeDirectIssue = false;
    bean.acmeConfig = null;
    bean.baseUrl = normalizeBaseUrl(req.baseUrl) || root.baseUrl || null;
    bean.pathLength = 0;
    bean.disabled = false;
    bean.remark = req.remark || "";
    const res = await this.add(bean);
    return { id: res.id };
  }

  async importCa(req: LocalCaImportReq) {
    await this.assertNameAvailable(req);
    let selfSigned: boolean;
    try {
      selfSigned = isSelfSignedCa(req.certPem);
    } catch (e: any) {
      throw new ValidateException(`证书解析失败：${e.message}`);
    }
    let parent: LocalCaEntity | null = null;
    let material;
    if (selfSigned) {
      material = await validateImportedRootCa({
        certPem: req.certPem,
        privateKeyPem: req.privateKeyPem,
      });
    } else {
      if (!req.parentId) {
        throw new ValidateException("导入中间CA时必须选择上级根CA");
      }
      parent = await this.getOwnedCa({ id: req.parentId, userId: req.userId, projectId: req.projectId });
      if (parent.caType !== "root") {
        throw new ValidateException("选中证书的上级必须是根CA");
      }
      material = await validateImportedIntermediateCa({
        certPem: req.certPem,
        privateKeyPem: req.privateKeyPem,
        parentCertPem: parent.certPem,
      });
    }
    const bean = new LocalCaEntity();
    bean.userId = req.userId;
    bean.projectId = req.projectId;
    bean.name = req.name.trim();
    bean.source = "imported";
    bean.caType = selfSigned ? "root" : "intermediate";
    bean.parentId = parent?.id ?? null;
    bean.keyType = material.keyType || "rsa2048";
    bean.keySize = material.keySize;
    bean.hashAlgorithm = "SHA256";
    bean.subject = JSON.stringify(material.subject);
    bean.subjectCn = material.subjectCn;
    bean.certPem = material.certPem;
    bean.privateKeyEncrypted = this.encryptService.encrypt(material.privateKeyPem);
    bean.privateKeyHash = sha256Hex(material.privateKeyPem);
    bean.keyEncryptVersion = "1";
    bean.fingerprintSha256 = material.fingerprintSha256;
    bean.notBefore = material.notBefore;
    bean.notAfter = material.notAfter;
    bean.usage = req.usage || "server";
    bean.allowedDomains = req.allowedDomains?.length ? JSON.stringify(req.allowedDomains) : null;
    bean.maxValidityDays = req.maxValidityDays || 0;
    bean.acmeEnabled = false;
    bean.acmeDirectIssue = false;
    bean.acmeConfig = null;
    bean.pathLength = material.pathLength ?? (selfSigned ? (getBasicConstraints(material.certPem).pathLength ?? 1) : 0);
    bean.disabled = false;
    bean.remark = req.remark || "";
    const res = await this.add(bean);
    return { id: res.id };
  }

  /**
   * CA 签发核心：流水线插件、独立签发、未来 ACME finalize 都走这里。
   */
  async signCsr(req: LocalCaSignCsrReq) {
    const ca = await this.getOwnedCa(req);
    if (ca.caType !== "intermediate") {
      throw new ValidateException("根CA不能直接签发叶子证书，请选择中间CA");
    }
    if (ca.disabled) {
      throw new ValidateException("该本地CA已禁用");
    }
    const privateKeyPem = this.decryptCaPrivateKey(ca);
    return await signCsr({
      caCertPem: ca.certPem,
      caPrivateKeyPem: privateKeyPem,
      csrPem: req.csrPem,
      validityDays: req.validityDays,
      maxValidityDays: ca.maxValidityDays,
      allowedDomains: this.parseAllowedDomains(ca.allowedDomains),
      usage: (req.usage || ca.usage) as LocalCaUsage,
      crlDistributionPoint: await this.getCrlUrl(ca),
    });
  }

  async issueLeaf(req: LocalCaIssueReq) {
    const ca = await this.getOwnedCa(req);
    if (ca.caType !== "intermediate") {
      throw new ValidateException("根CA不能直接签发叶子证书，请选择中间CA");
    }
    if (ca.disabled) {
      throw new ValidateException("该本地CA已禁用");
    }
    const privateKeyPem = this.decryptCaPrivateKey(ca);
    return await issueLeafCertificate({
      caCertPem: ca.certPem,
      caPrivateKeyPem: privateKeyPem,
      domains: req.domains,
      keyType: req.keyType || (ca.keyType as LocalCaKeyType),
      validityDays: req.validityDays,
      maxValidityDays: ca.maxValidityDays,
      allowedDomains: this.parseAllowedDomains(ca.allowedDomains),
      usage: (req.usage || ca.usage) as LocalCaUsage,
      crlDistributionPoint: await this.getCrlUrl(ca),
    });
  }

  async getAcmeCa(id: number) {
    const ca = await this.repository.findOne({ where: { id } });
    if (!ca || ca.caType !== "intermediate" || !ca.acmeEnabled) {
      throw new ValidateException("该本地CA未启用ACME服务（仅中间CA支持ACME）");
    }
    return ca;
  }

  async signCsrForAcme(caId: number, csrPem: string, validityDays = 90) {
    const ca = await this.getAcmeCa(caId);
    return await this.signCsr({
      id: ca.id,
      userId: ca.userId,
      projectId: ca.projectId,
      csrPem,
      validityDays,
    });
  }

  async setAcmeEnabled(req: LocalCaScope & { enabled: boolean; validityDays?: number }) {
    const ca = await this.getOwnedCa(req);
    if (ca.caType !== "intermediate") {
      throw new ValidateException("只有中间CA可以启用ACME服务");
    }
    ca.acmeEnabled = req.enabled;
    if (!req.enabled) {
      ca.acmeDirectIssue = false;
    }
    if (req.enabled && req.validityDays) {
      ca.acmeConfig = JSON.stringify({ validityDays: Math.max(1, Math.min(3650, req.validityDays)) });
    }
    await this.update(ca);
  }

  async createAcmeEab(req: Omit<LocalCaScope, "id"> & { caId: number; name: string; maxUses?: number; expiresDays?: number; allowedDomains?: string[] }) {
    const ca = await this.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId });
    if (ca.caType !== "intermediate") {
      throw new ValidateException("只有中间CA可以创建ACME凭证");
    }
    if (!ca.acmeEnabled) {
      throw new ValidateException("请先启用该中间CA的ACME服务");
    }
    const id = randomId(16);
    const kid = `eab_${randomId(12)}`;
    const hmacKey = randomEabHmacKey();
    const maxUses = Math.max(0, Math.min(10000, Number(req.maxUses ?? 1)));
    const expiresDays = Math.max(0, Math.min(3650, Number(req.expiresDays ?? 0)));
    const bean = this.acmeEabRepository.create({
      id,
      caId: ca.id,
      userId: req.userId,
      projectId: req.projectId,
      name: String(req.name || "").trim() || "ACME凭证",
      kid,
      allowedDomains: req.allowedDomains?.length ? JSON.stringify(req.allowedDomains) : null,
      hmacKeyEncrypted: this.encryptService.encrypt(hmacKey),
      hmacKeyHash: sha256Hex(hmacKey),
      maxUses,
      usedCount: 0,
      expiresTime: expiresDays > 0 ? Date.now() + expiresDays * 24 * 3600 * 1000 : null,
      disabled: false,
    });
    await this.acmeEabRepository.save(bean);
    return {
      id,
      caId: ca.id,
      name: bean.name,
      kid,
      hmacKey,
      maxUses,
      allowedDomains: req.allowedDomains || [],
      expiresTime: bean.expiresTime,
    };
  }

  async listAcmeEab(req: Omit<LocalCaScope, "id"> & { caId: number }) {
    const ca = await this.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId });
    const list = await this.acmeEabRepository.find({ where: { caId: ca.id }, order: { createTime: "DESC" } });
    return list.map(item => ({
      id: item.id,
      name: item.name,
      kid: item.kid,
      allowedDomains: item.allowedDomains,
      maxUses: item.maxUses,
      usedCount: item.usedCount,
      expiresTime: item.expiresTime,
      disabled: item.disabled,
      createTime: item.createTime,
    }));
  }

  async getAcmeEabSecret(caId: number, kid: string) {
    const bean = await this.acmeEabRepository.findOne({ where: { caId, kid } });
    if (!bean) {
      return null;
    }
    let hmacKey: string;
    try {
      hmacKey = this.encryptService.decrypt(bean.hmacKeyEncrypted);
    } catch (e) {
      return null;
    }
    if (bean.hmacKeyHash && sha256Hex(hmacKey) !== bean.hmacKeyHash) {
      return null;
    }
    return { ...bean, hmacKey };
  }

  async getAcmeEabProfile(id: string) {
    const bean = await this.acmeEabRepository.findOne({ where: { id } });
    if (!bean || bean.disabled || (bean.expiresTime && bean.expiresTime <= Date.now())) {
      return null;
    }
    let allowedDomains: string[] = [];
    if (bean.allowedDomains) {
      try {
        const parsed = JSON.parse(bean.allowedDomains);
        allowedDomains = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        allowedDomains = [];
      }
    }
    return { id: bean.id, allowedDomains };
  }

  async consumeAcmeEab(id: string, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(AcmeEabEntity) : this.acmeEabRepository;
    const metadata: any = repository.metadata;
    const usedCountColumn = metadata?.findColumnWithPropertyName?.("usedCount")?.databaseName || "used_count";
    const maxUsesColumn = metadata?.findColumnWithPropertyName?.("maxUses")?.databaseName || "max_uses";
    const result = await repository
      .createQueryBuilder()
      .update()
      .set({ usedCount: () => `${usedCountColumn} + 1`, updateTime: new Date() })
      .where("id = :id", { id })
      .andWhere(`(${maxUsesColumn} = 0 OR ${usedCountColumn} < ${maxUsesColumn})`)
      .execute();
    return (result.affected || 0) > 0;
  }

  async getCrl(id: number) {
    const ca = await this.findOne({ where: { id } });
    if (!ca) {
      throw new ValidateException("本地CA不存在");
    }
    const privateKeyPem = this.decryptCaPrivateKey(ca);
    const revoked = await this.certRevocationService.listByCa(ca.id);
    const now = Date.now();
    const entries = revoked
      .filter(item => item.serialNumber)
      // 证书过期后不再需要出现在完整CRL中；吊销记录本身永久保留
      .filter(item => !item.expiresTime || item.expiresTime > now)
      .map(item => ({
        serialNumber: item.serialNumber,
        revokeTime: item.revokedTime,
        reason: item.reason,
      }));
    const crl = await createCrl({
      caCertPem: ca.certPem,
      caPrivateKeyPem: privateKeyPem,
      entries,
    });
    return {
      ...crl,
      filename: `local-ca-${ca.id}.crl`,
    };
  }

  async getCaBaseUrl(caId: number) {
    const ca = await this.findOne({ where: { id: caId } });
    return await this.resolveBaseUrl(ca);
  }

  private async resolveBaseUrl(ca?: LocalCaEntity | null) {
    if (ca?.baseUrl) {
      return normalizeBaseUrl(ca.baseUrl);
    }
    if (!this.sysSettingsService) {
      return "http://127.0.0.1:7001";
    }
    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
    return normalizeBaseUrl(installInfo?.bindUrl || "http://127.0.0.1:7001");
  }

  private async getCrlUrl(ca: LocalCaEntity) {
    const baseUrl = await this.resolveBaseUrl(ca);
    return `${baseUrl}/api/cert/local-ca/crl?id=${ca.id}`;
  }

  async updateMeta(
    req: LocalCaScope & {
      name?: string;
      remark?: string;
      usage?: LocalCaUsage;
      maxValidityDays?: number;
      allowedDomains?: string[];
      baseUrl?: string;
      acmeDirectIssue?: boolean;
    }
  ) {
    const ca = await this.getOwnedCa(req);
    if (req.name != null && req.name.trim() !== ca.name) {
      await this.assertNameAvailable({
        userId: req.userId,
        projectId: req.projectId,
        name: req.name,
      });
      ca.name = req.name.trim();
    }
    if (req.remark != null) {
      ca.remark = req.remark;
    }
    if (req.usage != null) {
      if (!["server", "client", "both"].includes(req.usage)) {
        throw new ValidateException("CA用途不合法");
      }
      ca.usage = req.usage;
    }
    if (req.maxValidityDays != null) {
      const days = Number(req.maxValidityDays);
      if (!Number.isFinite(days) || days < 0) {
        throw new ValidateException("最大签发天数不合法");
      }
      ca.maxValidityDays = Math.floor(days);
    }
    if (req.allowedDomains != null) {
      const list = req.allowedDomains.map(item => String(item || "").trim()).filter(Boolean);
      ca.allowedDomains = list.length ? JSON.stringify(list) : null;
    }
    if (req.baseUrl != null) {
      ca.baseUrl = normalizeBaseUrl(req.baseUrl) || null;
    }
    if (req.acmeDirectIssue != null) {
      if (req.acmeDirectIssue && ca.caType !== "intermediate") {
        throw new ValidateException("只有中间CA可以开启EAB直签");
      }
      if (req.acmeDirectIssue && !ca.acmeEnabled) {
        throw new ValidateException("请先启用该中间CA的ACME服务");
      }
      ca.acmeDirectIssue = req.acmeDirectIssue === true;
    }
    await this.update(ca);
  }

  async listIssuedCerts(req: LocalCaScope) {
    const ca = await this.getOwnedCa(req);
    const where: any = {
      localCaId: ca.id,
      userId: req.userId,
    };
    if (req.projectId != null) {
      where.projectId = req.projectId;
    }
    const list = await this.certInfoService.find({
      where,
      order: { id: "DESC" },
    });
    const children = await this.find({ where: { parentId: ca.id }, order: { id: "DESC" } });
    const childRows = children.map(item => ({
      id: item.id,
      type: "ca",
      caType: item.caType,
      domain: item.subjectCn,
      domains: item.subjectCn,
      serialNumber: getCertSerialNumber(item.certPem),
      status: item.disabled ? "inactive" : "active",
      effectiveTime: item.notBefore,
      expiresTime: item.notAfter,
      applyTime: item.createTime ? new Date(item.createTime).getTime() : undefined,
      fromType: "ca",
      revokeTime: undefined,
    }));
    const leafRows = list.map(item => ({
      id: item.id,
      type: "leaf",
      caType: undefined,
      domain: item.domain,
      domains: item.domains,
      serialNumber: item.serialNumber,
      status: item.status,
      effectiveTime: item.effectiveTime,
      expiresTime: item.expiresTime,
      applyTime: item.applyTime,
      fromType: item.fromType,
      revokeTime: item.revokeTime,
    }));
    return [...childRows, ...leafRows];
  }

  async revokeIssuedCert(req: LocalCaScope & { certId: number }) {
    const ca = await this.getOwnedCa(req);
    const where: any = {
      id: req.certId,
      localCaId: ca.id,
      userId: req.userId,
    };
    if (req.projectId != null) {
      where.projectId = req.projectId;
    }
    const cert = await this.certInfoService.findOne({ where });
    if (!cert) {
      throw new ValidateException("证书记录不存在或无访问权限");
    }
    if (cert.status === CertStatus.revoked) {
      throw new ValidateException("证书已吊销");
    }
    if (!cert.serialNumber) {
      throw new ValidateException("证书序列号缺失，无法写入吊销记录");
    }
    await this.certInfoService.applyLocalRevocation({
      certInfoId: cert.id,
      caId: ca.id,
      userId: req.userId,
      projectId: req.projectId ?? ca.projectId,
      serialNumber: cert.serialNumber,
      expiresTime: cert.expiresTime,
    });
  }

  async getPublicKey(req: LocalCaScope) {
    const ca = await this.getOwnedCa(req);
    return {
      filename: `local-ca-${ca.id}-public-key.pem`,
      pem: getPublicKeyPem(ca.certPem),
    };
  }

  async getCrlInfo(req: LocalCaScope) {
    const crl = await this.getCrl(req.id);
    return {
      filename: `local-ca-${req.id}.crl`,
      ...parseCrlInfo(crl.pem),
    };
  }

  async exportCa(req: LocalCaScope) {
    const ca = await this.getOwnedCa(req);
    const privateKeyPem = this.decryptCaPrivateKey(ca);
    const lines = [
      "# Certd Local CA export",
      `# Name: ${ca.name}`,
      `# CN: ${ca.subjectCn}`,
      `# Fingerprint SHA-256: ${ca.fingerprintSha256}`,
      `# Not After: ${new Date(Number(ca.notAfter)).toISOString()}`,
      "# Keep this file secure. The private key can issue trusted certificates.",
      "",
      ca.certPem.trim(),
      "",
      privateKeyPem.trim(),
      "",
    ];
    return {
      filename: `local-ca-${ca.id}-${ca.subjectCn.replace(/[^a-zA-Z0-9._-]/g, "_")}.pem`,
      content: lines.join("\n"),
    };
  }

  async setDisabled(req: LocalCaScope & { disabled: boolean }) {
    const ca = await this.getOwnedCa(req);
    ca.disabled = req.disabled;
    await this.update(ca);
  }

  async deleteCa(req: LocalCaScope) {
    const ca = await this.getOwnedCa(req);
    const owner: any = { userId: req.userId };
    if (req.projectId != null) {
      owner.projectId = req.projectId;
    }
    const pipelines = await this.pipelineRepository.find({
      where: {
        ...owner,
        content: Like("%CertApplyLocalCa%"),
      },
      select: { id: true, title: true, content: true },
    });
    const referenced = pipelines.find(item => this.pipelineUsesCa(item.content, ca.id));
    if (referenced) {
      throw new ValidateException(`该本地CA已被流水线「${referenced.title}」引用，不能删除，请先修改流水线`);
    }
    if (!ca.disabled) {
      throw new ValidateException("请先禁用该本地CA，并确认所有已签发证书均已吊销或过期");
    }
    const children = await this.find({ where: { parentId: ca.id } });
    if (children.length > 0) {
      throw new ValidateException("该CA下仍有中间CA，请先删除中间CA");
    }
    const issued = await this.certInfoService.find({
      where: { localCaId: ca.id },
      select: { id: true, status: true, expiresTime: true },
    });
    const now = Date.now();
    const blocking = issued.filter(item => item.status !== CertStatus.revoked && (!item.expiresTime || item.expiresTime > now));
    if (blocking.length > 0) {
      throw new ValidateException("该本地CA仍有未吊销且未过期的证书，不能删除，请先吊销这些证书");
    }
    await this.delete([ca.id], this.buildUserProjectQuery(req.userId, req.projectId));
  }

  private pipelineUsesCa(content: string, caId: number) {
    if (!content) {
      return false;
    }
    try {
      const pipeline = JSON.parse(content);
      for (const stage of pipeline.stages || []) {
        for (const task of stage.tasks || []) {
          for (const step of task.steps || []) {
            if (step.type === "CertApplyLocalCa" && Number(step.input?.caId) === caId) {
              return true;
            }
          }
        }
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  async getCaCertPem(req: LocalCaScope) {
    const ca = await this.getOwnedCa(req);
    return {
      filename: `local-ca-${ca.id}.pem`,
      pem: ca.certPem,
    };
  }

  async assertCaOwner(req: LocalCaScope) {
    await this.getOwnedCa(req);
  }

  private async getOwnedCa(req: LocalCaScope) {
    const owner = this.buildUserProjectQuery(req.userId, req.projectId);
    const ca = await this.findOne({
      where: {
        id: req.id,
        ...owner,
      },
    });
    if (!ca) {
      throw new ValidateException("本地CA不存在或无访问权限");
    }
    return ca;
  }

  private decryptCaPrivateKey(ca: LocalCaEntity) {
    let plain: string;
    try {
      plain = this.encryptService.decrypt(ca.privateKeyEncrypted);
    } catch (e: any) {
      throw new Error(`CA私钥解密失败，系统加密密钥可能已变更：${e.message}`);
    }
    if (ca.privateKeyHash && sha256Hex(plain) !== ca.privateKeyHash) {
      throw new Error("CA私钥解密校验失败，私钥可能已损坏或被篡改");
    }
    return plain;
  }

  private parseAllowedDomains(value: string) {
    if (!value) {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  private async assertNameAvailable(req: { userId: number; projectId?: number; name: string }) {
    if (!req.name || !req.name.trim()) {
      throw new ValidateException("名称不能为空");
    }
    const owner = this.buildUserProjectQuery(req.userId, req.projectId);
    const old = await this.findOne({
      where: {
        name: req.name.trim(),
        ...owner,
      },
    });
    if (old) {
      throw new ValidateException(`本地CA名称「${req.name}」已存在`);
    }
  }

  private toSafe(item: LocalCaEntity): LocalCaSafe {
    const copy: any = { ...item };
    delete copy.privateKeyEncrypted;
    delete copy.privateKeyHash;
    return copy;
  }
}
