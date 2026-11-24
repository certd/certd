import * as x509 from "@peculiar/x509";
import { logger } from "@certd/basic";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { EncryptService, SysInstallInfo, SysSettingsService, ValidateException } from "@certd/lib-server";
import { runTransaction } from "../../db/db-transaction.js";
import { LocalCaEntity } from "../entity/local-ca.js";
import { CertRevocationService } from "./cert-revocation-service.js";
import { LocalCaAccessService, LocalCaScope } from "./local-ca-access-service.js";
import { createCrl, decryptCaPrivateKey, getCrlInfo as parseCrlInfo, getCertSerialNumber } from "./local-ca-crypto.js";

export function normalizeBaseUrl(value?: string) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  let url: URL;
  try {
    url = new URL(text);
  } catch (e) {
    throw new ValidateException("Base URL 格式不合法");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ValidateException("Base URL 必须以 http:// 或 https:// 开头");
  }
  if (url.username || url.password) {
    throw new ValidateException("Base URL 不能包含用户名或密码");
  }
  if (url.search || url.hash) {
    throw new ValidateException("Base URL 不能包含查询参数或片段");
  }
  const pathname = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname}`;
}

/**
 * 本地CA的CRL生成/缓存/刷新/查询，以及访问地址（Base URL/CRL URL）解析与锁定。
 * 依赖访问控制服务做归属校验；不依赖ACME子服务。
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class LocalCaCrlService {
  @InjectEntityModel(LocalCaEntity)
  repository: Repository<LocalCaEntity>;

  @Inject()
  encryptService: EncryptService;

  @Inject()
  certRevocationService: CertRevocationService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  accessService: LocalCaAccessService;

  async getCrl(id: number) {
    const ca = await this.repository.findOne({ where: { id } });
    if (!ca) {
      throw new ValidateException("本地CA不存在");
    }
    if (ca.caType === "root") {
      if (!ca.lastCrlPem || Number(ca.lastCrlTime || 0) <= 0) {
        throw new ValidateException("Root CRL尚未生成或已失效；请先创建中间CA或执行显式的Root CRL刷新");
      }
      const parsed = new x509.X509Crl(ca.lastCrlPem);
      if (parsed.nextUpdate && parsed.nextUpdate.getTime() <= Date.now()) {
        throw new ValidateException("Root CRL已过期，请通过管理接口执行显式刷新（需2FA/Passkey）");
      }
      return {
        pem: ca.lastCrlPem,
        der: Buffer.from(parsed.rawData),
        filename: `local-ca-${ca.id}.crl`,
      };
    }
    if (ca.lastCrlPem && Number(ca.lastCrlTime || 0) > 0) {
      try {
        const cached = new x509.X509Crl(ca.lastCrlPem);
        const nextUpdate = cached.nextUpdate?.getTime() || 0;
        if (nextUpdate > Date.now() + 60 * 60 * 1000) {
          return {
            pem: ca.lastCrlPem,
            der: Buffer.from(cached.rawData),
            filename: `local-ca-${ca.id}.crl`,
          };
        }
      } catch (e) {
        // 缓存损坏则重新生成
      }
    }
    const privateKeyPem = this.decryptCaPrivateKey(ca);
    // 条件写入失败说明序号已被并发吊销/生成推进，此时不能把本次生成的旧CRL返回给客户端。
    // 重新读取吊销快照后再生成；连续冲突时退回已经成功写入的最新缓存。
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const crlNumber = await this.nextCrlNumber(ca.id);
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
        crlNumber,
      });
      if (await this.storeCrlCache(ca.id, crlNumber, crl.pem)) {
        logger.info(`[local-ca] crl generated ca=${ca.id} number=${crlNumber} entries=${entries.length} attempts=${attempt + 1}`);
        return {
          ...crl,
          filename: `local-ca-${ca.id}.crl`,
        };
      }
      logger.warn(`[local-ca] crl cache conflict ca=${ca.id} number=${crlNumber} attempt=${attempt + 1}`);
    }
    const latest = await this.repository.findOne({ where: { id: ca.id } });
    if (latest?.lastCrlPem && Number(latest.lastCrlTime || 0) > 0) {
      try {
        const cached = new x509.X509Crl(latest.lastCrlPem);
        // 回退缓存同样必须未过期，避免向客户端返回已失效CRL
        if ((cached.nextUpdate?.getTime() || 0) > Date.now()) {
          return {
            pem: latest.lastCrlPem,
            der: Buffer.from(cached.rawData),
            filename: `local-ca-${ca.id}.crl`,
          };
        }
      } catch (e) {
        // 缓存损坏或已过期则继续抛出重试错误
      }
    }
    throw new ValidateException("CRL生成失败且没有可用缓存，请稍后重试");
  }

  async getCrlInfo(req: LocalCaScope) {
    const crl = await this.getCrl(req.id);
    const info = parseCrlInfo(crl.pem);
    // 序列号统一大写展示，与证书仓库/吊销记录存储格式一致
    if (Array.isArray(info.entries)) {
      info.entries = info.entries.map((item: any) => ({ ...item, serialNumber: String(item.serialNumber || "").toUpperCase() }));
    }
    return {
      filename: `local-ca-${req.id}.crl`,
      ...info,
    };
  }

  private async storeCrlCache(caId: number, crlNumber: number, pem: string) {
    // 只有当前 CRL Number 仍是本次生成值时才能覆盖，避免旧生成覆盖新CRL
    const result = await this.repository.createQueryBuilder().update().set({ lastCrlPem: pem, lastCrlTime: Date.now() }).where("id = :id AND crl_number = :crlNumber", { id: caId, crlNumber }).execute();
    return (result.affected || 0) > 0;
  }

  private async nextCrlNumber(caId: number) {
    const manager = this.repository.manager;
    if (!manager?.transaction) {
      throw new ValidateException("数据库事务不可用，无法生成CRL序号");
    }
    return await runTransaction(manager, async tx => {
      const repository = tx.getRepository(LocalCaEntity);
      const metadata: any = repository.metadata;
      const column = metadata?.findColumnWithPropertyName?.("crlNumber")?.databaseName || "crl_number";
      const updated = await repository
        .createQueryBuilder()
        .update()
        .set({ crlNumber: () => `${column} + 1` })
        .where("id = :id", { id: caId })
        .execute();
      if (!updated.affected) {
        throw new ValidateException("本地CA不存在");
      }
      const ca = await repository.findOne({ where: { id: caId } });
      return Number(ca.crlNumber);
    });
  }

  private async getRevocationEntries(caId: number) {
    const revoked = await this.certRevocationService.listByCa(caId);
    const now = Date.now();
    return revoked
      .filter(item => item.serialNumber)
      .filter(item => !item.expiresTime || item.expiresTime > now)
      .map(item => ({
        serialNumber: item.serialNumber,
        revokeTime: item.revokedTime,
        reason: item.reason,
      }));
  }

  /**
   * 生成并缓存Root CRL。
   * Root条目只在创建中间CA、吊销中间CA、显式刷新时变化；条件写入失败说明有并发刷新/吊销，
   * 必须重试，不能把未写入的序号当成成功结果返回。
   */
  async refreshRootCrlCache(root: LocalCaEntity, rootPrivateKeyPem?: string) {
    const privateKeyPem = rootPrivateKeyPem || this.decryptCaPrivateKey(root);
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const crlNumber = await this.nextCrlNumber(root.id);
      const entries = await this.getRevocationEntries(root.id);
      const crl = await createCrl({
        caCertPem: root.certPem,
        caPrivateKeyPem: privateKeyPem,
        entries,
        crlNumber,
        nextUpdateDays: 365,
      });
      if (await this.storeCrlCache(root.id, crlNumber, crl.pem)) {
        logger.info(`[local-ca] root crl generated ca=${root.id} number=${crlNumber} entries=${entries.length} attempts=${attempt + 1}`);
        return crlNumber;
      }
      logger.warn(`[local-ca] root crl cache conflict ca=${root.id} number=${crlNumber} attempt=${attempt + 1}`);
    }
    logger.warn(`[local-ca] root crl refresh exhausted ca=${root.id} attempts=${maxAttempts}`);
    throw new ValidateException("Root CRL刷新期间发生并发变更，请重试");
  }

  async refreshAllCrls() {
    const list = await this.repository.find({ where: { caType: "intermediate" } });
    for (const ca of list) {
      try {
        await this.getCrl(ca.id);
      } catch (e: any) {
        logger.warn(`本地CA CRL定时刷新失败(ca=${ca.id}): ${e?.message || e}`);
      }
    }
  }

  async refreshRootCrl(req: LocalCaScope) {
    const root = await this.accessService.getOwnedCa(req, true);
    if (root.caType !== "root") {
      throw new ValidateException("只有Root CA可以执行Root CRL刷新");
    }
    const crlNumber = await this.refreshRootCrlCache(root);
    return { crlNumber };
  }

  /**
   * 已归档Root只允许做CRL维护，不允许重新启用或签发。
   */
  async refreshArchivedRootCrl(req: LocalCaScope) {
    const root = await this.repository.findOne({ where: { id: req.id, deleted: true, caType: "root" } });
    if (!root) {
      throw new ValidateException("归档Root CA不存在或无访问权限");
    }
    await this.accessService.getAdminAccess(root.id, req.userId, true);
    const crlNumber = await this.refreshRootCrlCache(root);
    logger.info(`[local-ca] archived root crl refreshed ca=${root.id} number=${crlNumber} user=${req.userId}`);
    return { crlNumber };
  }

  async getCaBaseUrl(caId: number) {
    const ca = await this.repository.findOne({ where: { id: caId } });
    return await this.resolveBaseUrl(ca);
  }

  async resolveBaseUrl(ca?: LocalCaEntity | null) {
    if (ca?.baseUrl) {
      return normalizeBaseUrl(ca.baseUrl);
    }
    if (!this.sysSettingsService) {
      return "http://127.0.0.1:7001";
    }
    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
    return normalizeBaseUrl(installInfo?.bindUrl || "http://127.0.0.1:7001");
  }

  async getCrlUrl(ca: LocalCaEntity) {
    const baseUrl = await this.resolveBaseUrl(ca);
    return `${baseUrl}/api/sys/local-ca/crl?id=${ca.id}`;
  }

  async markBaseUrlLocked(caId: number, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(LocalCaEntity) : this.repository;
    const ca = await repository.findOne({ where: { id: caId } });
    if (!ca || ca.baseUrlLocked) {
      return;
    }
    // 锁定时把实际使用的地址固化到CA记录，避免后续bindUrl变化导致已签发证书CRL地址漂移
    const baseUrl = ca.baseUrl ? normalizeBaseUrl(ca.baseUrl) : await this.resolveBaseUrl(ca);
    await repository.update({ id: caId, baseUrlLocked: false } as any, { baseUrl: baseUrl || null, baseUrlLocked: true } as any);
  }

  private decryptCaPrivateKey(ca: LocalCaEntity) {
    return decryptCaPrivateKey(ca, value => this.encryptService.decrypt(value));
  }
  /**
   * CA 状态校验：中间CA是否已被上级根CA吊销。属于签发/ACME策略守卫，不属于ACL。
   */
  async assertCaNotRevokedByParent(ca: LocalCaEntity | null) {
    if (!ca || ca.caType !== "intermediate" || !ca.parentId) {
      return;
    }
    const serialNumber = getCertSerialNumber(ca.certPem);
    const revoked = await this.certRevocationService.findBySerial(ca.parentId, serialNumber);
    if (revoked) {
      throw new ValidateException("该本地CA已被上级根CA吊销，不能签发");
    }
  }

}