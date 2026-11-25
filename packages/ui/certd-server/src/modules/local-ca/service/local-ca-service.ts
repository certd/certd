import crypto from "node:crypto";
import net from "node:net";
import * as x509 from "@peculiar/x509";
import { logger } from "@certd/basic";
import { runTransaction } from "../../db/db-transaction.js";
import fs from "node:fs";
import path from "node:path";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { EntityManager, In, Like, Repository } from "typeorm";
import { BaseService, EncryptService, PageReq, SysSettingsService, ValidateException } from "@certd/lib-server";
import { LocalCaEntity } from "../entity/local-ca.js";
import { LocalCaAdminEntity } from "../entity/local-ca-admin.js";
import { LocalCaGrantEntity } from "../entity/local-ca-grant.js";
import { AcmeEabEntity, AcmeOrderEntity } from "../../acme-server/entity/acme-server.js";
import { CertInfoService } from "../../monitor/service/cert-info-service.js";
import { CertRevocationService } from "./cert-revocation-service.js";
import { CertStatus } from "../../monitor/entity/cert-info.js";
import { PipelineEntity } from "../../pipeline/entity/pipeline.js";
import { LocalCaAccessService, LocalCaScope } from "./local-ca-access-service.js";
import { LocalCaCrlService, normalizeBaseUrl } from "./local-ca-crl-service.js";
import { LocalCaAcmeService } from "./local-ca-acme-service.js";
import {
  createIntermediateCa,
  createRootCa,
  decryptCaPrivateKey,
  getBasicConstraints,
  getCertSerialNumber,
  getCrlDistributionUrls,
  getPublicKeyPem,
  isSelfSignedCa,
  issueLeafCertificate,
  LocalCaKeyType,
  LocalCaSubject,
  LocalCaUsage,
  matchAllowedDomains,
  normalizeAllowedDomains,
  parseAllowedDomains,
  verifyCertIssuedBy,
  signCsr,
  sha256Hex,
  validateImportedIntermediateCa,
  validateImportedRootCa,
} from "./local-ca-crypto.js";

export type { LocalCaScope } from "./local-ca-access-service.js";

function isUniqueConstraintError(e: any) {
  const code = String(e?.code || "");
  const message = String(e?.message || "");
  return ["SQLITE_CONSTRAINT", "23505", "ER_DUP_ENTRY"].includes(code) || /UNIQUE constraint failed|duplicate key|Duplicate entry/i.test(message);
}

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
  exportDisabled?: boolean;
  dnsServer?: string;
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
  exportDisabled?: boolean;
  dnsServer?: string;
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
  exportDisabled?: boolean;
  allowDuplicate?: boolean;
  allowExternalCrl?: boolean;
  dnsServer?: string;
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
  internal?: boolean;
};

export type LocalCaSafe = Omit<LocalCaEntity, "privateKeyEncrypted" | "privateKeyHash">;

/**
 * 本地CA对外统一入口（facade）：保留CA生命周期、签发与查询编排，
 * ACL/授权委托 LocalCaAccessService，CRL/Base URL委托 LocalCaCrlService，ACME视图/EAB委托 LocalCaAcmeService。
 * 依赖方向：facade → access/crl/acme；crl/acme → access；子服务之间不互相依赖。
 */
function normalizeDnsServerInput(value: any): string | null {
  const text = String(value || "").trim();
  if (!text) return null;
  const items = text.split(/[,，\s]+/).map(item => item.trim()).filter(Boolean);
  if (items.length > 5) {
    throw new ValidateException("DNS服务器最多配置5个");
  }
  for (const item of items) {
    let host = item;
    let port = "";
    if (item.startsWith("[")) {
      const match = item.match(/^\[([^\]]+)\](?::(\d+))?$/);
      if (!match || !net.isIP(match[1])) throw new ValidateException(`DNS服务器IPv6格式错误: ${item}`);
      host = match[1];
      port = match[2] || "";
    } else if (net.isIP(item)) {
      host = item;
    } else {
      const lastColon = item.lastIndexOf(":");
      if (lastColon > 0) {
        const maybePort = item.slice(lastColon + 1);
        const maybeHost = item.slice(0, lastColon);
        if (/^\d+$/.test(maybePort) && net.isIP(maybeHost) !== 6) {
          host = maybeHost;
          port = maybePort;
        }
      }
      if (!net.isIP(host) && !/^[a-zA-Z0-9._-]+$/.test(host)) {
        throw new ValidateException(`DNS服务器地址格式错误: ${item}`);
      }
    }
    if (port && (Number(port) < 1 || Number(port) > 65535)) {
      throw new ValidateException(`DNS服务器端口超出范围: ${item}`);
    }
  }
  return items.join(",");
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })

export class LocalCaService extends BaseService<LocalCaEntity> {
  @InjectEntityModel(LocalCaEntity)
  repository: Repository<LocalCaEntity>;

  @InjectEntityModel(PipelineEntity)
  pipelineRepository: Repository<PipelineEntity>;

  @InjectEntityModel(LocalCaAdminEntity)
  adminRepository: Repository<LocalCaAdminEntity>;

  // 授权/EAB业务已移至子服务；保留注入以兼容既有测试与调用方的直接赋值
  @InjectEntityModel(LocalCaGrantEntity)
  grantRepository: Repository<LocalCaGrantEntity>;

  @InjectEntityModel(AcmeEabEntity)
  acmeEabRepository: Repository<AcmeEabEntity>;

  @InjectEntityModel(AcmeOrderEntity)
  acmeOrderRepository: Repository<AcmeOrderEntity>;

  @Inject()
  encryptService: EncryptService;

  @Inject()
  certInfoService: CertInfoService;

  @Inject()
  certRevocationService: CertRevocationService;

  // Base URL解析已移至CRL服务；保留注入以兼容既有测试的直接赋值
  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  accessService: LocalCaAccessService;

  @Inject()
  crlService: LocalCaCrlService;

  @Inject()
  acmeService: LocalCaAcmeService;

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
    qb.andWhere("main.deleted = :deleted", { deleted: false });
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

  async listSafe(req: { adminUserId: number; searchKey?: string }) {
    const accesses = await this.adminRepository.find({ where: { adminUserId: req.adminUserId } });
    const ids = accesses.map(item => item.caId);
    const list = ids.length
      ? await this.find({
          where: { id: In(ids), deleted: false },
          order: { id: "DESC" },
        })
      : [];
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
    // 返回服务端实际解析出的访问地址，避免前端用自己的origin猜测ACME/CRL地址
    for (const item of safeList) {
      (item as any).effectiveBaseUrl = await this.crlService.resolveBaseUrl(item as any);
    }
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

  async getUserCa(req: LocalCaScope) {
    const ca = await this.followRotation(await this.accessService.getGrantedCa(req), req);
    const safe = this.toSafe(ca);
    (safe as any).effectiveBaseUrl = await this.crlService.resolveBaseUrl(safe as any);
    return safe;
  }

  /** 轮换后签发自动指向新CA（与ACME重定向一致），保证引用旧CA的流水线无缝续期。 */
  private async followRotation(ca: LocalCaEntity, req?: LocalCaScope): Promise<LocalCaEntity> {
    let hops = 0;
    while (ca.rotatedToId && hops < 5) {
      const next = await this.repository.findOne({ where: { id: ca.rotatedToId, deleted: false } });
      if (!next) {
        break;
      }
      ca = req && !(req as any).internal ? await this.accessService.getGrantedCa({ ...req, id: next.id }) : next;
      hops++;
    }
    return ca;
  }

  async infoSafe(req: LocalCaScope) {
    const safe = this.toSafe(await this.accessService.getOwnedCa(req));
    delete (safe as any).dnsServer;
    (safe as any).effectiveBaseUrl = await this.crlService.resolveBaseUrl(safe as any);
    return safe;
  }

  /**
   * 授权用户（或管理员）读取CA的公开配置，供流水线域名校验等场景使用。
   */
  async infoForUse(req: LocalCaScope) {
    const safe = this.toSafe(await this.accessService.getGrantedCa(req));
    delete (safe as any).dnsServer;
    (safe as any).effectiveBaseUrl = await this.crlService.resolveBaseUrl(safe as any);
    return safe;
  }

  private toOptionList(list: LocalCaEntity[]) {
    return list.map(item => ({
      id: item.id,
      name: item.name,
      subjectCn: item.subjectCn,
      caType: item.caType,
      parentId: item.parentId,
      acmeEnabled: item.acmeEnabled,
      disabled: item.disabled,
      notAfter: item.notAfter,
      baseUrl: (item as any).effectiveBaseUrl,
    }));
  }

  async listOptions(req: { userId: number; projectId?: number; searchKey?: string }) {
    const grants = await this.accessService.listApplicableGrants(req);
    const accesses = req.userId > 0 ? await this.adminRepository.find({ where: { adminUserId: req.userId } }) : [];
    const allowedIds = [...new Set([...grants.map(item => item.caId), ...accesses.map(item => item.caId)])];
    if (allowedIds.length === 0) {
      return [];
    }
    const list = await this.find({ where: { id: In(allowedIds), caType: "intermediate", deleted: false }, order: { id: "DESC" } });
    // 选择器仅展示可用中间CA：排除已轮换退役/禁用/归档的CA
    const usable = list.filter(item => !item.disabled && !item.rotatedToId);
    const filtered = usable.filter(item => !req.searchKey || item.name.toLowerCase().includes(req.searchKey.toLowerCase()) || item.subjectCn.toLowerCase().includes(req.searchKey.toLowerCase()));
    const safeList = filtered.map(item => this.toSafe(item));
    for (const item of safeList) {
      (item as any).effectiveBaseUrl = await this.crlService.resolveBaseUrl(item as any);
    }
    return this.toOptionList(safeList as any);
  }

  async listAdminOptions(req: { adminUserId: number; searchKey?: string }) {
    const list = await this.listSafe({ adminUserId: req.adminUserId, searchKey: req.searchKey });
    const usable = list.filter((item: any) => item.caType === "intermediate" && !item.disabled && !item.rotatedToId);
    return this.toOptionList(usable as any);
  }

  async getOptionsByIds(req: { ids: number[]; userId: number; projectId?: number }) {
    const ids = this.filterIds(req.ids || []);
    if (ids.length === 0) {
      return [];
    }
    const grants = await this.accessService.listApplicableGrants(req);
    const accesses = req.userId > 0 ? await this.adminRepository.find({ where: { adminUserId: req.userId } }) : [];
    const allowedIds = new Set([...grants.map(item => item.caId), ...accesses.map(item => item.caId)]);
    const list = await this.find({
      where: {
        id: In(ids.filter(id => allowedIds.has(id))),
        caType: "intermediate",
        deleted: false,
      },
    });
    const safeList = list.map(item => this.toSafe(item));
    for (const item of safeList) {
      (item as any).effectiveBaseUrl = await this.crlService.resolveBaseUrl(item as any);
    }
    return this.toOptionList(safeList as any);
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
    const list = normalizeAllowedDomains(req.allowedDomains);
    bean.allowedDomains = list.length ? JSON.stringify(list) : null;
    const rootMaxDays = req.maxValidityDays || 0;
    const rootCertLimit = Math.max(1, Math.floor((req.validityYears || 10) * 365));
    if (rootMaxDays > rootCertLimit) {
      throw new ValidateException(`根CA的最大签发天数不能超过根CA证书有效期(${rootCertLimit}天)`);
    }
    bean.maxValidityDays = rootMaxDays;
    bean.acmeEnabled = false;
    bean.acmeConfig = null;
    bean.baseUrl = normalizeBaseUrl(req.baseUrl);
    bean.pathLength = 1;
    bean.disabled = false;
    bean.remark = req.remark || "";
    bean.exportDisabled = req.exportDisabled === true;
    bean.deleted = false;
    bean.revoked = false;
    const res = await this.add(bean);
    await this.accessService.addAdminAccess(res.id, req.userId, "owner");
    logger.info(`[local-ca] root generated ca=${res.id} admin=${req.userId} key=${keyType}`);
    return { id: res.id };
  }

  async generateIntermediateCa(req: LocalCaIntermediateReq) {
    await this.assertNameAvailable(req);
    const root = await this.accessService.getOwnedCa({ id: req.rootId, userId: req.userId, projectId: req.projectId }, true);
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
      crlDistributionPoint: await this.crlService.getCrlUrl(root),
    });
    const bean = new LocalCaEntity();
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
    const childAllowedDomains = await this.resolveChildAllowedDomains(req.allowedDomains, root);
    bean.allowedDomains = childAllowedDomains.length ? JSON.stringify(childAllowedDomains) : null;
    const childMaxDays = await this.resolveChildMaxValidity(req.maxValidityDays, root);
    const childCertLimit = Math.max(1, Math.floor((req.validityYears || 5) * 365));
    if (childMaxDays > childCertLimit) {
      throw new ValidateException(`中间CA的最大签发天数不能超过中间CA证书有效期(${childCertLimit}天)`);
    }
    bean.maxValidityDays = childMaxDays;
    bean.acmeEnabled = false;
    bean.acmeConfig = null;
    bean.baseUrl = normalizeBaseUrl(req.baseUrl) || root.baseUrl || (await this.crlService.resolveBaseUrl(root));
    bean.dnsServer = normalizeDnsServerInput(req.dnsServer);
    bean.pathLength = 0;
    bean.disabled = false;
    bean.remark = req.remark || "";
    bean.exportDisabled = req.exportDisabled === true;
    bean.deleted = false;
    bean.revoked = false;
    await this.crlService.refreshRootCrlCache(root, rootPrivateKey);
    const res = await this.add(bean);
    await this.accessService.addAdminAccess(res.id, req.userId, "owner");
    await this.crlService.markBaseUrlLocked(root.id);
    logger.info(`[local-ca] intermediate generated ca=${res.id} root=${root.id} admin=${req.userId}`);
    return { id: res.id };
  }

  /**
   * 轮换中间CA：生成全新密钥对的新中间CA，复制授权/管理员/策略；旧中间CA停止签发但暂不吊销，
   * 已签发的叶证书仍可用旧中间CA验证，直到自然过期或完成重签。
   */
  async rotateIntermediateCa(req: { id: number; userId: number; name?: string; subject?: LocalCaSubject; keyType?: LocalCaKeyType; validityYears?: number }) {
    const old = await this.accessService.getOwnedCa({ id: req.id, userId: req.userId }, true);
    if (old.caType !== "intermediate" || !old.parentId) {
      throw new ValidateException("只有中间CA可以轮换");
    }
    if (old.revoked) {
      throw new ValidateException("该中间CA已吊销，不能轮换");
    }
    const root = await this.accessService.getOwnedCa({ id: old.parentId, userId: req.userId }, true);
    if (root.caType !== "root" || root.disabled) {
      throw new ValidateException("上级根CA不可用，不能轮换");
    }
    const baseName = old.name.replace(/\s*G\d+$/, "").replace(/-rotated$/, "").trim();
    const siblings = await this.getRepository().find({ where: { deleted: false, name: Like(`${baseName}%`) } });
    let generation = 1;
    for (const c of siblings) {
      const m = c.name.match(/\sG(\d+)$/);
      if (m) generation = Math.max(generation, Number(m[1]));
    }
    const name = (req.name || `${baseName} G${generation + 1}`).trim();
    await this.assertNameAvailable({ userId: req.userId, name });
    const rootPrivateKey = this.decryptCaPrivateKey(root);
    const subject = req.subject || (JSON.parse(old.subject) as LocalCaSubject);
    const material = await createIntermediateCa({
      rootCertPem: root.certPem,
      rootPrivateKeyPem: rootPrivateKey,
      subject,
      keyType: req.keyType || (old.keyType as LocalCaKeyType),
      validityYears: req.validityYears || Math.max(1, Math.round((Number(old.notAfter) - Number(old.notBefore)) / (365 * 24 * 3600 * 1000))),
      crlDistributionPoint: await this.crlService.getCrlUrl(root),
    });
    const bean = new LocalCaEntity();
    bean.name = name;
    bean.source = "generated";
    bean.caType = "intermediate";
    bean.parentId = root.id;
    bean.keyType = material.keyType || old.keyType;
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
    bean.usage = old.usage;
    bean.allowedDomains = old.allowedDomains;
    bean.maxValidityDays = old.maxValidityDays;
    bean.acmeEnabled = old.acmeEnabled;
    bean.acmeConfig = old.acmeConfig;
    bean.baseUrl = old.baseUrl || root.baseUrl || null;
    bean.dnsServer = old.dnsServer;
    bean.pathLength = 0;
    bean.disabled = false;
    bean.remark = `轮换自CA(ID:${old.id})`;
    bean.exportDisabled = old.exportDisabled;
    bean.deleted = false;
    bean.revoked = false;
    await this.crlService.refreshRootCrlCache(root, rootPrivateKey);
    const res = await this.add(bean);
    await this.accessService.copyAdminsAndGrants(old.id, res.id, req.userId);
    await this.crlService.markBaseUrlLocked(root.id);
    old.disabled = true;
    old.rotatedToId = res.id;
    old.remark = `已轮换到新CA(ID:${res.id})，ACME自动指向新CA`;
    await this.update(old);
    logger.info(`[local-ca] intermediate rotated old=${old.id} new=${res.id} root=${root.id} admin=${req.userId}`);
    return { id: res.id, oldId: old.id };
  }

  async checkImportDuplicate(req: { userId: number; projectId?: number; parentId?: number; certPem: string }) {
    let fingerprint: string;
    let selfSigned: boolean;
    try {
      fingerprint = new crypto.X509Certificate(req.certPem).fingerprint256.replaceAll(":", "").toLowerCase();
      selfSigned = isSelfSignedCa(req.certPem);
    } catch (e: any) {
      throw new ValidateException(`证书解析失败：${e.message}`);
    }
    const duplicated = await this.repository.findOne({
      where: { fingerprintSha256: fingerprint },
      select: { id: true, name: true },
    });
    const base = duplicated ? { duplicated: true, id: duplicated.id, name: duplicated.name } : { duplicated: false };
    if (selfSigned || req.parentId == null) {
      return base;
    }
    const parent = await this.accessService.getOwnedCa({ id: req.parentId, userId: req.userId, projectId: req.projectId });
    const expectedCrlUrl = await this.crlService.getCrlUrl(parent);
    const expected = new URL(expectedCrlUrl).toString().replace(/\/+$/, "");
    const urls = getCrlDistributionUrls(req.certPem).filter(url => {
      try {
        return ["http:", "https:"].includes(new URL(url).protocol);
      } catch (e) {
        return false;
      }
    });
    let matchedLocalCrl = false;
    let externalCrl = false;
    let mismatchCrl = false;
    for (const value of urls) {
      const url = new URL(value);
      const looksLikeLocal = url.pathname.includes("/api/sys/local-ca/crl");
      if (url.origin === new URL(expected).origin || looksLikeLocal) {
        if (url.toString().replace(/\/+$/, "") !== expected) {
          mismatchCrl = true;
        } else {
          matchedLocalCrl = true;
        }
      } else {
        externalCrl = true;
      }
    }
    return {
      ...base,
      expectedCrlUrl,
      missingCrl: urls.length === 0,
      mismatchCrl,
      externalCrl: externalCrl && !matchedLocalCrl,
    };
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
      parent = await this.accessService.getOwnedCa({ id: req.parentId, userId: req.userId, projectId: req.projectId });
      if (!parent) {
        throw new ValidateException("上级根CA不存在");
      }
      if (parent.caType !== "root") {
        throw new ValidateException("选中证书的上级必须是根CA");
      }
      material = await validateImportedIntermediateCa({
        certPem: req.certPem,
        privateKeyPem: req.privateKeyPem,
        parentCertPem: parent.certPem,
        expectedCrlUrl: await this.crlService.getCrlUrl(parent),
        allowExternalCrl: req.allowExternalCrl === true,
      });
      // 重新导入不能绕过父CA的吊销记录
      const serialNumber = getCertSerialNumber(material.certPem);
      const revoked = await this.certRevocationService.findBySerial(parent.id, serialNumber);
      if (revoked) {
        throw new ValidateException("该中间CA已被上级根CA吊销，不能导入");
      }
    }
    const duplicated = await this.repository.findOne({
      where: { fingerprintSha256: material.fingerprintSha256 },
    });
    if (duplicated && req.allowDuplicate !== true) {
      throw new ValidateException(`该CA证书已在「${duplicated.name}」中登记。重复记录可能无法妥善管理，建议新建一个；如仍需继续导入，请确认后重试`);
    }
    if (duplicated) {
      logger.warn(`[local-ca] duplicate ca import allowed ca=${duplicated.id} user=${req.userId} project=${req.projectId ?? "-"}`);
    }
    const bean = new LocalCaEntity();
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
    bean.usage = req.usage || parent?.usage || "server";
    if (selfSigned) {
      const list = normalizeAllowedDomains(req.allowedDomains);
      bean.allowedDomains = list.length ? JSON.stringify(list) : null;
    } else {
      const list = await this.resolveChildAllowedDomains(req.allowedDomains, parent);
      bean.allowedDomains = list.length ? JSON.stringify(list) : null;
    }
    if (selfSigned) {
      bean.maxValidityDays = req.maxValidityDays != null ? this.normalizeMaxValidityDays(req.maxValidityDays) : 0;
    } else {
      bean.maxValidityDays = await this.resolveChildMaxValidity(req.maxValidityDays, parent);
    }
    bean.acmeEnabled = false;
    bean.acmeConfig = null;
    bean.baseUrl = normalizeBaseUrl(req.baseUrl) || parent?.baseUrl || null;
    bean.dnsServer = normalizeDnsServerInput(req.dnsServer);
    bean.pathLength = material.pathLength ?? (selfSigned ? getBasicConstraints(material.certPem).pathLength ?? 1 : 0);
    bean.disabled = false;
    bean.remark = req.remark || "";
    bean.exportDisabled = req.exportDisabled === true;
    bean.deleted = false;
    bean.revoked = false;
    let res;
    try {
      res = await this.add(bean);
    } catch (e: any) {
      if (isUniqueConstraintError(e)) {
        throw new ValidateException("该CA证书已登记，不能重复导入");
      }
      throw e;
    }
    await this.accessService.addAdminAccess(res.id, req.userId, "owner");
    if (parent) {
      await this.crlService.markBaseUrlLocked(parent.id);
    }
    logger.info(`[local-ca] ca imported ca=${res.id} type=${bean.caType} parent=${bean.parentId ?? "-"} admin=${req.userId}`);
    return { id: res.id };
  }

  /**
   * CA 签发核心：流水线插件、独立签发、未来 ACME finalize 都走这里。
   */
  async signCsr(req: LocalCaSignCsrReq) {
    const ca = await this.followRotation(req.internal ? await this.findOne({ where: { id: req.id, deleted: false } }) : await this.accessService.getGrantedCa(req), req);
    if (!ca) {
      throw new ValidateException("本地CA不存在或无访问权限");
    }
    if (ca.caType !== "intermediate") {
      throw new ValidateException("根CA不能直接签发叶子证书，请选择中间CA");
    }
    if (ca.revoked) {
      throw new ValidateException("该本地CA已被父CA吊销，不能签发");
    }
    if (ca.disabled) {
      throw new ValidateException("该本地CA已禁用");
    }
    await this.crlService.assertCaNotRevokedByParent(ca);
    const maxValidityDays = await this.resolveEffectiveMaxValidityDays(ca);
    if (maxValidityDays <= 0) {
      throw new ValidateException("中间CA必须设置有限的最大签发天数");
    }
    const privateKeyPem = this.decryptCaPrivateKey(ca);
    const result = await signCsr({
      caCertPem: ca.certPem,
      caPrivateKeyPem: privateKeyPem,
      csrPem: req.csrPem,
      validityDays: req.validityDays,
      maxValidityDays,
      allowedDomains: parseAllowedDomains(ca.allowedDomains),
      usage: (req.usage || ca.usage) as LocalCaUsage,
      crlDistributionPoint: await this.crlService.getCrlUrl(ca),
    });
    await this.assertCaStillUsable(ca.id);
    if (!ca.baseUrlLocked) {
      await this.markBaseUrlLocked(ca.id);
      ca.baseUrlLocked = true;
    }
    logger.info(`[local-ca] leaf issued ca=${ca.id} serial=${result.serialNumber} user=${req.userId} project=${req.projectId ?? "-"}`);
    return result;
  }

  async issueLeaf(req: LocalCaIssueReq) {
    const ca = await this.followRotation(await this.accessService.getGrantedCa(req), req);
    if (ca.caType !== "intermediate") {
      throw new ValidateException("根CA不能直接签发叶子证书，请选择中间CA");
    }
    if (ca.revoked) {
      throw new ValidateException("该本地CA已被父CA吊销，不能签发");
    }
    if (ca.disabled) {
      throw new ValidateException("该本地CA已禁用");
    }
    await this.crlService.assertCaNotRevokedByParent(ca);
    const maxValidityDays = await this.resolveEffectiveMaxValidityDays(ca);
    if (maxValidityDays <= 0) {
      throw new ValidateException("中间CA必须设置有限的最大签发天数");
    }
    const privateKeyPem = this.decryptCaPrivateKey(ca);
    const result = await issueLeafCertificate({
      caCertPem: ca.certPem,
      caPrivateKeyPem: privateKeyPem,
      domains: req.domains,
      keyType: req.keyType || (ca.keyType as LocalCaKeyType),
      validityDays: req.validityDays,
      maxValidityDays,
      allowedDomains: parseAllowedDomains(ca.allowedDomains),
      usage: (req.usage || ca.usage) as LocalCaUsage,
      crlDistributionPoint: await this.crlService.getCrlUrl(ca),
    });
    await this.assertCaStillUsable(ca.id);
    if (!ca.baseUrlLocked) {
      await this.markBaseUrlLocked(ca.id);
      ca.baseUrlLocked = true;
    }
    logger.info(`[local-ca] leaf issued ca=${ca.id} serial=${result.serialNumber} domains=${req.domains.length} user=${req.userId} project=${req.projectId ?? "-"}`);
    return result;
  }

  /**
   * 签名期间CA可能被并发禁用/吊销；返回证书前再次确认，避免把已失效CA新签的证书交给调用方。
   */
  private async assertCaStillUsable(caId: number) {
    const ca = await this.findOne({ where: { id: caId, deleted: false } });
    if (!ca || ca.disabled || ca.revoked) {
      throw new ValidateException("本地CA已被禁用或吊销，本次签发已取消");
    }
    if (ca.notAfter && ca.notAfter < Date.now()) {
      throw new ValidateException("本地CA已过期，本次签发已取消");
    }
    await this.crlService.assertCaNotRevokedByParent(ca);
  }

  async getAcmeCa(id: number) {
    return await this.acmeService.getAcmeCa(id);
  }

  /**
   * 吊销接口允许CA已禁用：否则CA关闭后其历史证书将无法撤销，也无法安全归档删除。
   */
  async getCaForAcmeRevocation(id: number) {
    return await this.acmeService.getCaForAcmeRevocation(id);
  }

  /**
   * finalize 时在事务内重新读取并锁定CA行，确保关闭直签/收紧域名范围与签发不会交错。
   */
  async getAcmeAccessView(id: number) {
    return await this.acmeService.getAcmeAccessView(id);
  }

  async getAcmeCaForUpdate(id: number, manager: EntityManager) {
    return await this.acmeService.getAcmeCaForUpdate(id, manager);
  }

  async markBaseUrlLocked(caId: number, manager?: EntityManager) {
    return await this.crlService.markBaseUrlLocked(caId, manager);
  }

  /**
   * ACME直签编排入口：组合ACME视图校验与签发核心。
   * 保留在facade以避免ACME子服务反向依赖LocalCaService造成循环。
   */
  async signCsrForAcme(caId: number, csrPem: string, validityDays = 90) {
    const ca = await this.acmeService.getAcmeCa(caId);
    return await this.signCsr({
      id: ca.id,
      userId: 0,
      csrPem,
      validityDays,
      internal: true,
    });
  }

  async setAcmeEnabled(req: LocalCaScope & { enabled: boolean; validityDays?: number }) {
    return await this.acmeService.setAcmeEnabled(req);
  }

  async getAcmeAccess(req: LocalCaScope & { caId: number }) {
    return await this.acmeService.getAcmeAccess(req);
  }

  async setAcmeAccess(req: LocalCaScope & { caId: number; ipAllowlist?: any; basicAuth?: any; requiredHeaders?: any }) {
    return await this.acmeService.setAcmeAccess(req);
  }

  async createAcmeEab(req: Omit<LocalCaScope, "id"> & { caId: number; name: string; maxUses?: number; expiresDays?: number; allowedDomains?: string[]; grantId?: number; remark?: string; privileged?: boolean }) {
    return await this.acmeService.createAcmeEab(req);
  }

  async setAcmeEabPrivileged(req: Omit<LocalCaScope, "id"> & { caId: number; eabId: string; privileged: boolean }) {
    return await this.acmeService.setAcmeEabPrivileged(req);
  }

  async setAcmeEabDisabled(req: Omit<LocalCaScope, "id"> & { caId: number; eabId: string; disabled: boolean }) {
    return await this.acmeService.setAcmeEabDisabled(req);
  }

  async listAcmeEab(req: Omit<LocalCaScope, "id"> & { caId: number }) {
    return await this.acmeService.listAcmeEab(req);
  }

  async getAcmeEabSecret(caId: number, kid: string) {
    return await this.acmeService.getAcmeEabSecret(caId, kid);
  }

  async getAcmeEabProfile(id: string, manager?: EntityManager) {
    return await this.acmeService.getAcmeEabProfile(id, manager);
  }

  async consumeAcmeEab(id: string, manager?: EntityManager) {
    return await this.acmeService.consumeAcmeEab(id, manager);
  }

  async getCrl(id: number) {
    return await this.crlService.getCrl(id);
  }

  async getCrlInfo(req: LocalCaScope) {
    return await this.crlService.getCrlInfo(req);
  }

  async getCaBaseUrl(caId: number) {
    return await this.crlService.getCaBaseUrl(caId);
  }

  async refreshAllCrls() {
    return await this.crlService.refreshAllCrls();
  }

  async refreshRootCrl(req: LocalCaScope) {
    return await this.crlService.refreshRootCrl(req);
  }

  /**
   * 已归档Root只允许做CRL维护，不允许重新启用或签发。
   */
  async refreshArchivedRootCrl(req: LocalCaScope) {
    return await this.crlService.refreshArchivedRootCrl(req);
  }

  async requiresStepUpForUpdate(req: LocalCaScope & { usage?: string; maxValidityDays?: number; allowedDomains?: string[]; baseUrl?: string; exportDisabled?: boolean; dnsServer?: string }) {
    const ca = await this.accessService.getOwnedCa(req);
    if (req.allowedDomains != null) {
      try {
        if (JSON.stringify(normalizeAllowedDomains(req.allowedDomains)) !== JSON.stringify(parseAllowedDomains(ca.allowedDomains))) {
          return true;
        }
      } catch (e) {
        return true;
      }
    }
    if (req.maxValidityDays != null && this.normalizeMaxValidityDays(req.maxValidityDays) !== (Number(ca.maxValidityDays) || 0)) {
      return true;
    }
    if (req.usage != null && req.usage !== ca.usage) {
      return true;
    }
    if (req.baseUrl != null && normalizeBaseUrl(req.baseUrl) !== normalizeBaseUrl(ca.baseUrl)) {
      return true;
    }
    if (req.exportDisabled === false && ca.exportDisabled === true) {
      return true;
    }
    if (req.dnsServer != null && normalizeDnsServerInput(req.dnsServer) !== (ca.dnsServer || null)) {
      return true;
    }
    return false;
  }

  async listGrants(req: LocalCaScope) {
    return await this.accessService.listGrants(req);
  }

  async addGrant(req: { id: number; userId: number; grantUserId?: number; grantProjectId?: number }) {
    return await this.accessService.addGrant(req);
  }

  async removeGrant(req: { id: number; userId: number; grantId: number }) {
    const ca = await this.accessService.getOwnedCa({ id: req.id, userId: req.userId }, true);
    const manager = this.repository.manager;
    if (!manager?.transaction) {
      throw new ValidateException("数据库事务不可用，无法撤销授权");
    }
    // 撤销授权与禁用EAB同事务，避免并发窗口残留可用EAB
    await runTransaction(manager, async tx => {
      const grantRepository = tx.getRepository(LocalCaGrantEntity);
      const grant = await grantRepository.findOne({ where: { id: req.grantId, caId: ca.id } });
      if (!grant) {
        throw new ValidateException("授权不存在");
      }
      const duplicates = await grantRepository.find({ where: { caId: ca.id, userId: grant.userId, projectId: grant.projectId } });
      const grantIds = duplicates.map(item => item.id);
      const eabs = await tx.getRepository(AcmeEabEntity).find({ where: { grantId: In(grantIds) }, select: { id: true } });
      await tx.getRepository(AcmeEabEntity).update({ grantId: In(grantIds) }, { disabled: true, updateTime: new Date() } as any);
      await this.acmeService.invalidateDirectOrdersByEabIds(tx, eabs.map(item => item.id), "用户授权已撤销，EAB凭证已禁用，请重新创建订单");
      await grantRepository.delete({ id: In(grantIds) } as any);
    });
  }

  async listAdmins(req: LocalCaScope) {
    return await this.accessService.listAdmins(req);
  }

  async addCaAdmin(req: { id: number; userId: number; adminUserId: number; role?: string }) {
    return await this.accessService.addCaAdmin(req);
  }

  async removeCaAdmin(req: { id: number; userId: number; adminUserId: number }) {
    return await this.accessService.removeCaAdmin(req);
  }

  async updateMeta(
    req: LocalCaScope & {
      name?: string;
      remark?: string;
      usage?: LocalCaUsage;
      maxValidityDays?: number;
      allowedDomains?: string[];
      baseUrl?: string;
      exportDisabled?: boolean;
      dnsServer?: string;
    }
  ) {
    const ca = await this.accessService.getOwnedCa(req);
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
      const days = this.normalizeMaxValidityDays(req.maxValidityDays);
      if (ca.caType === "intermediate" && ca.parentId) {
        const parent = await this.findOne({ where: { id: ca.parentId, deleted: false } });
        if (!parent) {
          throw new ValidateException("上级CA不存在，无法设置最大签发天数");
        }
        const parentLimit = await this.resolveParentMaxValidityDays(parent);
        this.assertChildMaxValidity(days, parentLimit);
      }
      ca.maxValidityDays = days;
    }
    if (req.allowedDomains != null) {
      let list = normalizeAllowedDomains(req.allowedDomains);
      if (ca.caType === "intermediate" && ca.parentId) {
        const parent = await this.findOne({ where: { id: ca.parentId } });
        if (!parent) {
          throw new ValidateException("上级CA不存在，无法设置允许域名");
        }
        list = await this.resolveChildAllowedDomains(list, parent);
      } else if (ca.caType === "root" && list.length > 0) {
        await this.assertRootAllowedDomainsCoverChildren(ca, list);
      }
      ca.allowedDomains = list.length ? JSON.stringify(list) : null;
    }
    if (req.baseUrl != null) {
      const nextBaseUrl = normalizeBaseUrl(req.baseUrl) || null;
      const currentBaseUrl = normalizeBaseUrl(ca.baseUrl) || null;
      if (nextBaseUrl !== currentBaseUrl) {
        if (ca.caType === "intermediate") {
          throw new ValidateException("中间CA的Base URL不可修改，证书内CRL/ACME地址已固定；如需变更请新建中间CA");
        }
        if (ca.baseUrlLocked) {
          throw new ValidateException("该CA的访问地址已用于签发证书或创建ACME账户，修改会导致历史CRL/ACME地址失效，已禁止变更");
        }
        if (ca.acmeEnabled) {
          throw new ValidateException("该CA的ACME服务已启用，修改访问地址会影响现有Directory URL，请先停用ACME服务");
        }
      }
      ca.baseUrl = nextBaseUrl;
    }
    if (req.dnsServer != null) {
      ca.dnsServer = normalizeDnsServerInput(req.dnsServer);
    }
    if (req.exportDisabled != null) {
      ca.exportDisabled = req.exportDisabled === true;
    }
    await this.update(ca);
  }

  async listIssuedCerts(req: LocalCaScope) {
    const ca = await this.accessService.getOwnedCa(req);
    const list = await this.certInfoService.find({
      where: { localCaId: ca.id },
      order: { id: "DESC" },
    });
    const children = await this.find({ where: { parentId: ca.id, deleted: false }, order: { id: "DESC" } });
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
      crt: (() => {
        try {
          return JSON.parse(item.certInfo || "{}").crt || null;
        } catch {
          return null;
        }
      })(),
    }));
    return [...childRows, ...leafRows];
  }

  /** 按序列号查证书PEM（供CRL/订单查看证书信息）。
   * 根CA的CRL条目是其下级中间CA签发的证书，故需在本CA及全部下级CA范围内查找；
   * 允许已归档CA（CRL永久公开，查看证书信息不受deleted限制）。 */
  async getCertPemBySerial(req: { id: number; userId: number; serial: string }): Promise<string | null> {
    const serial = String(req.serial || "").trim().replace(/[:\s]/g, "").toUpperCase();
    if (!serial) {
      return null;
    }
    const ca = await this.findOne({ where: { id: req.id } });
    if (!ca) {
      throw new ValidateException("本地CA不存在");
    }
    const access = await this.adminRepository.findOne({ where: { caId: req.id, adminUserId: req.userId } });
    if (!access) {
      throw new ValidateException("本地CA不存在或无访问权限");
    }
    const ids = [ca.id];
    const children = await this.find({ where: { parentId: ca.id } });
    ids.push(...children.map(item => item.id));
    const order = await this.acmeOrderRepository.findOne({ where: { caId: In(ids), serialNumber: serial } });
    if (order?.certPem) {
      return order.certPem;
    }
    const cert = await this.certInfoService.findOne({ where: { localCaId: In(ids), serialNumber: serial } });
    if (cert?.certInfo) {
      try {
        const crt = JSON.parse(cert.certInfo).crt;
        if (crt) {
          return crt;
        }
      } catch {
        // ignore
      }
    }
    const revocation = await this.certRevocationService.findBySerial(ca.id, serial);
    return revocation?.certPem || null;
  }

  async revokeIssuedCert(req: LocalCaScope & { certId: number }) {
    const ca = await this.accessService.getOwnedCa(req);
    const cert = await this.certInfoService.findOne({ where: { id: req.certId, localCaId: ca.id } });
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
      userId: cert.userId,
      projectId: cert.projectId,
      serialNumber: cert.serialNumber,
      expiresTime: cert.expiresTime,
    });
  }

  /**
   * ACME系统级证书（未绑定用户仓库）也需要写入CRL；此入口只允许ACME服务在完成协议授权后调用。
   */
  async recordSystemCertRevocation(req: { caId: number; serialNumber: string; expiresTime?: number; userId?: number; projectId?: number; reason?: string; certPem?: string }) {
    const ca = await this.findOne({ where: { id: req.caId } });
    if (!ca) {
      throw new ValidateException("本地CA不存在");
    }
    const existing = await this.certRevocationService.findBySerial(ca.id, req.serialNumber);
    if (existing) {
      return existing.revokedTime;
    }
    const manager = this.repository.manager;
    if (!manager?.transaction) {
      throw new ValidateException("数据库事务不可用，无法安全吊销证书");
    }
    const revokedTime = Date.now();
    await runTransaction(manager, async tx => {
      await this.certRevocationService.record(
        {
          caId: ca.id,
          userId: req.userId ?? 0,
          projectId: req.projectId,
          serialNumber: req.serialNumber,
          revokedTime,
          expiresTime: req.expiresTime,
          reason: req.reason,
          certPem: req.certPem,
        },
        tx
      );
      await tx
        .getRepository(LocalCaEntity)
        .createQueryBuilder()
        .update()
        .set({ lastCrlTime: -1, crlNumber: () => "crl_number + 1" } as any)
        .where("id = :id", { id: ca.id })
        .execute();
    });
    return revokedTime;
  }

  /**
   * 计算CA层级中实际生效的最大签发天数。
   * 0 表示不限制，但中间CA最终必须得到有限值。
   */
  private async resolveEffectiveMaxValidityDays(ca: LocalCaEntity) {
    let limit = Number(ca.maxValidityDays) || 0;
    let parentId = ca.parentId;
    const seen = new Set<number>();
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId);
      const parent = await this.findOne({ where: { id: parentId, deleted: false } });
      if (!parent) {
        break;
      }
      const parentLimit = Number(parent.maxValidityDays) || 0;
      if (parentLimit > 0) {
        limit = limit > 0 ? Math.min(limit, parentLimit) : parentLimit;
      }
      parentId = parent.parentId;
    }
    return limit;
  }

  private async resolveParentMaxValidityDays(parent: LocalCaEntity) {
    return await this.resolveEffectiveMaxValidityDays(parent);
  }

  private normalizeMaxValidityDays(value: number) {
    const days = Number(value);
    if (!Number.isFinite(days) || days < 0) {
      throw new ValidateException("最大签发天数不合法");
    }
    return Math.floor(days);
  }

  private assertChildMaxValidity(requested: number, parentLimit: number) {
    if (parentLimit > 0 && requested > parentLimit) {
      throw new ValidateException(`中间CA的最大签发天数不能超过上级CA的${parentLimit}天`);
    }
    if (parentLimit === 0 && requested === 0) {
      throw new ValidateException("上级CA未限制签发天数时，中间CA必须设置有限的最大签发天数");
    }
  }

  private async resolveChildMaxValidity(requested: number | undefined, parent: LocalCaEntity) {
    const parentLimit = await this.resolveParentMaxValidityDays(parent);
    const value = requested != null ? this.normalizeMaxValidityDays(requested) : parentLimit;
    this.assertChildMaxValidity(value, parentLimit);
    return value;
  }

  async listArchivedRoots(req: Omit<LocalCaScope, "id">) {
    const accesses = await this.adminRepository.find({ where: { adminUserId: req.userId } });
    const ids = accesses.map(item => item.caId);
    const roots = ids.length ? await this.find({ where: { id: In(ids), deleted: true }, order: { id: "DESC" } }) : [];
    return roots.map(root => {
      let nextUpdate: number | undefined;
      try {
        nextUpdate = root.lastCrlPem ? new x509.X509Crl(root.lastCrlPem).nextUpdate?.getTime() : undefined;
      } catch (e) {
        nextUpdate = undefined;
      }
      return {
        id: root.id,
        name: root.name,
        caType: root.caType,
        subjectCn: root.subjectCn,
        keyType: root.keyType,
        source: root.source,
        notBefore: root.notBefore,
        notAfter: root.notAfter,
        fingerprintSha256: root.fingerprintSha256,
        revoked: root.revoked,
        crlNextUpdate: nextUpdate,
      };
    });
  }

  /** 管理员查看已归档CA详情（含证书PEM），用于归档表格的查看详细信息。 */
  async getArchivedCaInfo(req: { id: number; userId: number }) {
    const access = await this.adminRepository.findOne({ where: { caId: req.id, adminUserId: req.userId } });
    if (!access) {
      throw new ValidateException("本地CA不存在或无访问权限");
    }
    const ca = await this.findOne({ where: { id: req.id, deleted: true } });
    if (!ca) {
      throw new ValidateException("该CA未归档或不存在");
    }
    return this.toSafe(ca);
  }

  async revokeIntermediate(req: LocalCaScope & { reason?: string }) {
    const ca = await this.accessService.getOwnedCa(req, true);
    if (ca.caType !== "intermediate" || !ca.parentId) {
      throw new ValidateException("只能吊销中间CA");
    }
    const root = await this.findOne({ where: { id: ca.parentId, deleted: false } });
    if (!root || root.caType !== "root") {
      throw new ValidateException("中间CA的上级根CA不存在");
    }
    if (!verifyCertIssuedBy(ca.certPem, root.certPem)) {
      throw new ValidateException("中间CA证书不是由该根CA签发，拒绝吊销");
    }
    const serialNumber = getCertSerialNumber(ca.certPem);
    const revokedTime = Date.now();
    const manager = this.repository.manager;
    if (!manager?.transaction) {
      throw new ValidateException("数据库事务不可用，无法安全吊销中间CA");
    }
    // 先持久化不可逆吊销状态与吊销记录，再生成CRL；CRL失败也不能恢复签发能力
    await runTransaction(manager, async tx => {
      await tx.getRepository(LocalCaEntity).update({ id: ca.id }, { disabled: true, revoked: true });
      // 递增Root的CRL序号，防止并发的旧Root CRL覆盖包含本次吊销的新CRL
      await tx
        .getRepository(LocalCaEntity)
        .createQueryBuilder()
        .update()
        .set({ lastCrlTime: -1, crlNumber: () => "crl_number + 1" } as any)
        .where("id = :id", { id: root.id })
        .execute();
      await this.certRevocationService.record(
        {
          caId: root.id,
          userId: req.userId,
          projectId: req.projectId,
          serialNumber,
          revokedTime,
          expiresTime: ca.notAfter,
          reason: req.reason || "unspecified",
        },
        tx
      );
    });
    ca.disabled = true;
    ca.revoked = true;

    // 这是显式的 Root 私钥使用操作：只在吊销中间CA时解密一次，生成并缓存Root CRL
    let crlNumber: number;
    try {
      crlNumber = await this.crlService.refreshRootCrlCache(root);
    } catch (e: any) {
      logger.warn(`[local-ca] intermediate revoke crl refresh failed ca=${ca.id} root=${root.id}: ${e?.message || e}`);
      // 只更新缓存标记，避免用事务前的旧实体覆盖已经递增的CRL序号
      await this.repository.update({ id: root.id }, { lastCrlTime: -1 } as any);
      throw e;
    }

    logger.info(`[local-ca] intermediate revoked ca=${ca.id} root=${root.id} serial=${serialNumber} crl=${crlNumber} user=${req.userId}`);
    return { serialNumber, crlNumber };
  }

  async getPublicKey(req: LocalCaScope) {
    const ca = await this.accessService.getOwnedCa(req);
    return {
      filename: `local-ca-${ca.id}-public-key.pem`,
      pem: getPublicKeyPem(ca.certPem),
    };
  }


  private getExportDir() {
    return path.join(process.cwd(), "data", "local-ca-export");
  }

  /** 清理超过24小时的CA导出明文文件。 */
  async cleanupExpiredExports() {
    const dir = this.getExportDir();
    let entries: string[] = [];
    try {
      entries = await fs.promises.readdir(dir);
    } catch {
      return;
    }
    const cutoff = Date.now() - 24 * 3600 * 1000;
    for (const name of entries) {
      if (!name.endsWith(".pem")) continue;
      const file = path.join(dir, name);
      try {
        const stat = await fs.promises.stat(file);
        if (stat.mtimeMs < cutoff) {
          await fs.promises.unlink(file);
          logger.info(`[local-ca] expired export removed file=${name}`);
        }
      } catch {
        // ignore
      }
    }
  }

  async exportCa(req: LocalCaScope) {
    const ca = await this.accessService.getOwnedCa(req, true);
    if (ca.exportDisabled) {
      throw new ValidateException("该CA已禁止导出");
    }
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
    const filename = `local-ca-${ca.id}-${ca.subjectCn.replace(/[^a-zA-Z0-9._-]/g, "_")}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.pem`;
    // 导出到专用临时目录，0600权限，最多保留24小时，由定时任务清理
    const exportDir = this.getExportDir();
    await fs.promises.mkdir(exportDir, { recursive: true, mode: 0o700 });
    await this.cleanupExpiredExports();
    const filePath = path.join(exportDir, filename);
    await fs.promises.writeFile(filePath, lines.join("\n"), { encoding: "utf8", mode: 0o600, flag: "wx" });
    await fs.promises.chmod(filePath, 0o600);
    logger.info(`[local-ca] private key exported ca=${ca.id} admin=${req.userId} ttl=24h`);
    return { filename, path: filePath, expiresAt: Date.now() + 24 * 3600 * 1000 };
    logger.info(`[local-ca] private key exported ca=${ca.id} admin=${req.userId}`);
    return {
      filename,
      path: filePath,
    };
  }

  async setDisabled(req: LocalCaScope & { disabled: boolean }) {
    if (typeof req.disabled !== "boolean") {
      throw new ValidateException("disabled必须是布尔值");
    }
    const ca = await this.accessService.getOwnedCa(req);
    if (!req.disabled && ca.revoked) {
      throw new ValidateException("该本地CA已被父CA吊销，不能重新启用");
    }
    if (!req.disabled && ca.rotatedToId) {
      throw new ValidateException("该CA已轮换到新CA，旧CA密钥已退役，不能重新启用，请使用新CA签发");
    }
    ca.disabled = req.disabled;
    await this.update(ca);
    logger.info(`[local-ca] ca ${req.disabled ? "disabled" : "enabled"} ca=${ca.id} user=${req.userId} project=${req.projectId ?? "-"}`);
  }

  async archiveCa(req: LocalCaScope & { force?: boolean }) {
    const ca = await this.accessService.getOwnedCa(req, true);
    const pipelines = await this.pipelineRepository.find({
      where: {
        content: Like("%CertApplyLocalCa%"),
      },
      select: { id: true, title: true, content: true },
    });
    const referenced = pipelines.find(item => this.pipelineUsesCa(item.content, ca.id));
    if (referenced && !req.force) {
      throw new ValidateException(`该本地CA已被流水线「${referenced.title}」引用，不能归档，请先修改流水线`);
    }
    if (referenced && req.force) {
      logger.warn(`[local-ca] force archive ca=${ca.id} despite pipeline reference「${referenced.title}」 user=${req.userId}`);
    }
    if (!ca.disabled) {
      throw new ValidateException("请先禁用该本地CA，再归档");
    }
    if (ca.caType === "intermediate" && !ca.revoked && !ca.rotatedToId) {
      throw new ValidateException("请先吊销该中间CA，再归档");
    }
    const children = await this.find({ where: { parentId: ca.id, deleted: false } });
    if (children.length > 0) {
      throw new ValidateException("该CA下仍有未归档的中间CA，请先归档中间CA");
    }
    const issued = await this.certInfoService.find({
      where: { localCaId: ca.id },
      select: { id: true, status: true, expiresTime: true },
    });
    const now = Date.now();
    const blocking = issued.filter(item => item.status !== CertStatus.revoked && (!item.expiresTime || item.expiresTime > now));
    // 已轮换退役的CA允许直接归档：其已签发证书继续有效直至过期，CRL仍可访问，无需先吊销
    if (!ca.rotatedToId && blocking.length > 0) {
      throw new ValidateException("该本地CA仍有未吊销且未过期的证书，不能归档，请先吊销这些证书");
    }
    // 未绑定用户仓库的ACME系统级证书不在cd_cert_info中，也需要按订单记录阻止归档（已轮换退役CA除外）
    if (!ca.rotatedToId) {
      const issuedSerials = new Set(issued.map(item => String(item.serialNumber || "").toUpperCase()));
      const validOrders = await this.acmeOrderRepository.find({
        where: { caId: ca.id, status: "valid" },
        select: { serialNumber: true, expiresTime: true },
      });
      for (const order of validOrders || []) {
        const serial = String(order.serialNumber || "").toUpperCase();
        if (!serial || issuedSerials.has(serial) || !order.expiresTime || order.expiresTime <= now) {
          continue;
        }
        const revoked = await this.certRevocationService.findBySerial(ca.id, serial);
        if (!revoked) {
          throw new ValidateException(`该本地CA仍有未吊销且未过期的ACME证书(${serial})，不能归档，请先吊销这些证书`);
        }
      }
    }
    ca.deleted = true;
    ca.disabled = true;
    await this.update(ca);
    logger.info(`[local-ca] ca archived ca=${ca.id} user=${req.userId} project=${req.projectId ?? "-"}`);
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
    const ca = await this.accessService.getOwnedCa(req);
    return {
      filename: `local-ca-${ca.id}.pem`,
      pem: ca.certPem,
    };
  }

  async assertCaOwner(req: LocalCaScope) {
    await this.accessService.assertCaOwner(req);
  }

  async assertAdminCa(caId: number, adminUserId: number, requireOwner = false) {
    return await this.accessService.assertAdminCa(caId, adminUserId, requireOwner);
  }

  async findAdminAccess(caId: number, adminUserId: number) {
    return await this.accessService.findAdminAccess(caId, adminUserId);
  }

  async addAdminAccess(caId: number, adminUserId: number, role = "owner") {
    return await this.accessService.addAdminAccess(caId, adminUserId, role);
  }

  private decryptCaPrivateKey(ca: LocalCaEntity) {
    return decryptCaPrivateKey(ca, value => this.encryptService.decrypt(value));
  }

  private async resolveChildAllowedDomains(reqList: string[] | undefined, parent: LocalCaEntity) {
    const parentList = parseAllowedDomains(parent.allowedDomains);
    const childList = normalizeAllowedDomains(reqList);
    if (childList.length === 0) {
      return parentList;
    }
    if (parentList.length > 0) {
      matchAllowedDomains(childList, parentList);
    }
    return childList;
  }

  private async assertRootAllowedDomainsCoverChildren(ca: LocalCaEntity, rootAllowedDomains: string[]) {
    const children = await this.find({ where: { parentId: ca.id, deleted: false } });
    for (const child of children) {
      let childList: string[];
      try {
        childList = parseAllowedDomains(child.allowedDomains);
      } catch (e) {
        throw new ValidateException(`子CA「${child.name}」的允许域名配置损坏，无法修改根CA范围`);
      }
      if (childList.length === 0) {
        throw new ValidateException(`子CA「${child.name}」当前未限制允许域名，请先为子CA设置范围`);
      }
      try {
        matchAllowedDomains(childList, rootAllowedDomains);
      } catch (e) {
        throw new ValidateException(`子CA「${child.name}」的允许域名超出新的根CA范围`);
      }
    }
  }

  private async assertNameAvailable(req: { userId: number; projectId?: number; name: string }) {
    if (!req.name || !req.name.trim()) {
      throw new ValidateException("名称不能为空");
    }
    const old = await this.findOne({
      where: {
        name: req.name.trim(),
        deleted: false,
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
    // acmeConfig 含 Basic密码哈希/自定义头密钥/IP白名单，禁止经DTO泄漏；访问控制配置走专用脱敏接口getAcmeAccess
    delete copy.acmeConfig;
    return copy;
  }
}