import crypto from "node:crypto";
import { logger } from "@certd/basic";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { EncryptService, ValidateException } from "@certd/lib-server";
import { runTransaction } from "../../db/db-transaction.js";
import { LocalCaEntity } from "../entity/local-ca.js";
import { LocalCaGrantEntity } from "../entity/local-ca-grant.js";
import { AcmeEabEntity, AcmeOrderEntity } from "../../acme-server/entity/acme-server.js";
import { randomId } from "../../acme-server/protocol/acme-jws.js";
import { LocalCaAccessService, LocalCaScope } from "./local-ca-access-service.js";
import { LocalCaCrlService } from "./local-ca-crl-service.js";
import { normalizeAllowedDomains, sha256Hex } from "./local-ca-crypto.js";

function randomEabHmacKey() {
  // RFC 8555 EAB HMAC key：统一使用无填充的 base64url
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * 本地CA的ACME视图：CA可用性检查、EAB凭证管理与直签策略。
 * 依赖访问控制服务做归属校验；签发入口 signCsrForAcme 由 LocalCaService 编排，避免反向依赖facade。
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class LocalCaAcmeService {
  @InjectEntityModel(LocalCaEntity)
  repository: Repository<LocalCaEntity>;

  @InjectEntityModel(AcmeEabEntity)
  acmeEabRepository: Repository<AcmeEabEntity>;

  @InjectEntityModel(AcmeOrderEntity)
  acmeOrderRepository: Repository<AcmeOrderEntity>;

  @Inject()
  encryptService: EncryptService;

  @Inject()
  accessService: LocalCaAccessService;

  @Inject()
  crlService: LocalCaCrlService;

  private assertAcmeCaUsable(ca: LocalCaEntity | null) {
    if (!ca || ca.caType !== "intermediate" || !ca.acmeEnabled) {
      throw new ValidateException("该本地CA未启用ACME服务（仅中间CA支持ACME）");
    }
    if (ca.revoked) {
      throw new ValidateException("该本地CA已被父CA吊销，ACME服务不可用");
    }
    if (ca.disabled) {
      throw new ValidateException("该本地CA已禁用，ACME服务不可用");
    }
    if (ca.notAfter && ca.notAfter <= Date.now()) {
      throw new ValidateException("该本地CA已过期，ACME服务不可用");
    }
  }

  async getAcmeCa(id: number) {
    const ca = await this.resolveEffectiveAcmeCa(id);
    this.assertAcmeCaUsable(ca);
    await this.crlService.assertCaNotRevokedByParent(ca);
    return ca;
  }

  /**
   * 轮换无感：旧中间CA的ACME账户/EAB/订单命名空间保持不变，
   * 签发与策略自动指向轮换后的新CA。遵循AWS/IBM替换CA最佳实践。
   */
  private async resolveEffectiveAcmeCa(id: number, manager?: EntityManager): Promise<LocalCaEntity> {
    const repository = manager ? manager.getRepository(LocalCaEntity) : this.repository;
    let ca = await repository.findOne({ where: { id, deleted: false } });
    let hops = 0;
    while (ca?.rotatedToId && hops < 5) {
      const next = await repository.findOne({ where: { id: ca.rotatedToId, deleted: false } });
      if (!next) break;
      ca = next;
      hops++;
    }
    return ca;
  }

  /**
   * 吊销接口允许CA已禁用：否则CA关闭后其历史证书将无法撤销，也无法安全归档删除。
   */
  async getCaForAcmeRevocation(id: number) {
    const ca = await this.repository.findOne({ where: { id, deleted: false } });
    if (!ca) {
      throw new ValidateException("本地CA不存在");
    }
    return ca;
  }

  /**
   * finalize 时在事务内重新读取并锁定CA行，确保关闭直签/收紧域名范围与签发不会交错。
   */
  async getAcmeCaForUpdate(id: number, manager: EntityManager) {
    const repository = manager.getRepository(LocalCaEntity);
    const driverType = String(manager.connection?.options?.type || "");
    const useLock = !driverType.includes("sqlite");
    let ca = await repository.findOne({
      where: { id, deleted: false },
      ...(useLock ? { lock: { mode: "pessimistic_write" as const } } : {}),
    });
    let hops = 0;
    while (ca?.rotatedToId && hops < 5) {
      const next = await repository.findOne({
        where: { id: ca.rotatedToId, deleted: false },
        ...(useLock ? { lock: { mode: "pessimistic_write" as const } } : {}),
      });
      if (!next) break;
      ca = next;
      hops++;
    }
    this.assertAcmeCaUsable(ca);
    await this.crlService.assertCaNotRevokedByParent(ca);
    return ca;
  }

  async setAcmeEnabled(req: LocalCaScope & { enabled: boolean; validityDays?: number }) {
    const ca = await this.accessService.getOwnedCa(req);
    if (ca.caType !== "intermediate") {
      throw new ValidateException("只有中间CA可以启用ACME服务");
    }
    if (!req.enabled) {
      // 关闭ACME时原子关闭直签并失效未完成直签订单，避免重新启用后旧订单复活
      await this.disableAcmeDirectIssue(ca, true);
      ca.acmeEnabled = false;
      ca.acmeDirectIssue = false;
      logger.info(`[local-ca] acme disabled ca=${ca.id} user=${req.userId} project=${req.projectId ?? "-"}`);
      return;
    }
    ca.acmeEnabled = true;
    if (req.validityDays) {
      ca.acmeConfig = JSON.stringify({ validityDays: Math.max(1, Math.min(3650, req.validityDays)) });
    }
    ca.updateTime = new Date();
    await this.repository.save(ca);
    logger.info(`[local-ca] acme enabled ca=${ca.id} user=${req.userId} project=${req.projectId ?? "-"}`);
  }

  /**
   * 关闭EAB直签（或整个ACME服务）时在同一事务内失效尚未完成的直签订单。
   */
  async disableAcmeDirectIssue(ca: LocalCaEntity, disableAcme = false) {
    const manager = this.repository.manager;
    if (!manager?.transaction) {
      throw new ValidateException("数据库事务不可用，无法关闭ACME直签");
    }
    await runTransaction(manager, async tx => {
      const caRepository = tx.getRepository(LocalCaEntity);
      const driverType = String(tx.connection?.options?.type || "");
      if (!driverType.includes("sqlite")) {
        await caRepository.findOne({ where: { id: ca.id }, lock: { mode: "pessimistic_write" as const } });
      }
      await caRepository.update({ id: ca.id }, { acmeDirectIssue: false, ...(disableAcme ? { acmeEnabled: false } : {}) } as any);
      const errorMessage = disableAcme ? "ACME服务已关闭，请重新创建订单" : "EAB直签已关闭，请重新创建订单";
      await tx.getRepository(AcmeOrderEntity).update({ caId: ca.id, directIssue: true, status: In(["pending", "ready"]) }, { status: "invalid", error: errorMessage, updateTime: new Date() } as any);
    });
    logger.info(`[local-ca] ${disableAcme ? "acme disabled" : "direct issue disabled"} ca=${ca.id}; unfinished direct orders invalidated`);
  }

  async createAcmeEab(req: Omit<LocalCaScope, "id"> & { caId: number; name: string; maxUses?: number; expiresDays?: number; allowedDomains?: string[]; grantId?: number }) {
    const ca = await this.accessService.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId });
    if (ca.caType !== "intermediate") {
      throw new ValidateException("只有中间CA可以创建ACME凭证");
    }
    if (!ca.acmeEnabled) {
      throw new ValidateException("请先启用该中间CA的ACME服务");
    }
    const id = randomId(16);
    const kid = `eab_${randomId(12)}`;
    const hmacKey = randomEabHmacKey();
    const toInt = (value: any, fallback: number) => {
      const num = Number(value);
      return Number.isFinite(num) ? Math.trunc(num) : fallback;
    };
    const maxUses = Math.max(0, Math.min(10000, toInt(req.maxUses, 1)));
    const expiresDays = Math.max(0, Math.min(3650, toInt(req.expiresDays, 0)));
    const allowedDomains = normalizeAllowedDomains(req.allowedDomains);
    const bean = this.acmeEabRepository.create({
      id,
      caId: ca.id,
      grantId: req.grantId ?? null,
      userId: 0,
      projectId: undefined,
      name: String(req.name || "").trim() || "ACME凭证",
      kid,
      allowedDomains: allowedDomains.length ? JSON.stringify(allowedDomains) : null,
      hmacKeyEncrypted: this.encryptService.encrypt(hmacKey),
      hmacKeyHash: sha256Hex(hmacKey),
      maxUses,
      usedCount: 0,
      expiresTime: expiresDays > 0 ? Date.now() + expiresDays * 24 * 3600 * 1000 : null,
      disabled: false,
    });
    const manager = this.repository.manager;
    if (!manager?.transaction) {
      throw new ValidateException("数据库事务不可用，无法创建ACME凭证");
    }
    // 授权校验与EAB保存同事务，并对Grant加锁，避免与撤销授权并发产生失效EAB
    await runTransaction(manager, async tx => {
      if (req.grantId != null) {
        const driverType = String(tx.connection?.options?.type || "");
        const useLock = !driverType.includes("sqlite");
        const grant = await tx.getRepository(LocalCaGrantEntity).findOne({
          where: { id: req.grantId, caId: ca.id },
          ...(useLock ? { lock: { mode: "pessimistic_write" as const } } : {}),
        });
        if (!grant || grant.disabled) {
          throw new ValidateException("EAB绑定的用户授权不存在或已禁用");
        }
        bean.userId = grant.userId;
        bean.projectId = grant.projectId > 0 ? grant.projectId : undefined;
      }
      await tx.getRepository(AcmeEabEntity).save(bean);
    });
    logger.info(`[local-ca] eab created ca=${ca.id} eab=${bean.id} kid=${kid} maxUses=${maxUses} allowedDomains=${allowedDomains.length}`);
    return {
      id,
      caId: ca.id,
      name: bean.name,
      kid,
      hmacKey,
      maxUses,
      allowedDomains,
      grantId: bean.grantId,
      userId: bean.userId,
      projectId: bean.projectId,
      expiresTime: bean.expiresTime,
    };
  }

  async setAcmeEabDisabled(req: Omit<LocalCaScope, "id"> & { caId: number; eabId: string; disabled: boolean }) {
    if (typeof req.disabled !== "boolean") {
      throw new ValidateException("disabled必须是布尔值");
    }
    const ca = await this.accessService.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId });
    if (ca.caType !== "intermediate") {
      throw new ValidateException("只有中间CA可以管理ACME凭证");
    }
    const manager = this.repository.manager;
    if (!manager?.transaction) {
      throw new ValidateException("数据库事务不可用，无法变更ACME凭证状态");
    }
    const result = await runTransaction(manager, async tx => {
      const repository = tx.getRepository(AcmeEabEntity);
      const driverType = String(tx.connection?.options?.type || "");
      const useLock = !driverType.includes("sqlite");
      const bean = await repository.findOne({
        where: { id: req.eabId, caId: ca.id },
        ...(useLock ? { lock: { mode: "pessimistic_write" as const } } : {}),
      });
      if (!bean) {
        throw new ValidateException("ACME凭证不存在或无访问权限");
      }
      if (req.disabled === false && bean.grantId) {
        const grant = await tx.getRepository(LocalCaGrantEntity).findOne({ where: { id: bean.grantId, caId: ca.id } });
        if (!grant || grant.disabled) {
          throw new ValidateException("关联用户授权已撤销，不能重新启用该EAB凭证");
        }
      }
      bean.disabled = req.disabled;
      bean.updateTime = new Date();
      await repository.save(bean);
      return { id: bean.id, disabled: bean.disabled };
    });
    logger.info(`[local-ca] eab ${result.disabled ? "disabled" : "enabled"} ca=${ca.id} eab=${result.id} user=${req.userId}`);
    return result;
  }

  async listAcmeEab(req: Omit<LocalCaScope, "id"> & { caId: number }) {
    const ca = await this.accessService.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId });
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
      grantId: item.grantId,
      userId: item.userId,
      projectId: item.projectId,
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

  async getAcmeEabProfile(id: string, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(AcmeEabEntity) : this.acmeEabRepository;
    const driverType = String(repository.manager?.connection?.options?.type || "");
    const useLock = !!manager && !driverType.includes("sqlite");
    const bean = await repository.findOne({
      where: { id },
      ...(useLock ? { lock: { mode: "pessimistic_write" as const } } : {}),
    });
    if (!bean || bean.disabled || (bean.expiresTime && bean.expiresTime <= Date.now())) {
      return null;
    }
    if (bean.grantId) {
      const grantRepository = manager ? manager.getRepository(LocalCaGrantEntity) : this.repository.manager.getRepository(LocalCaGrantEntity);
      const grant = await grantRepository.findOne({ where: { id: bean.grantId, caId: bean.caId } });
      if (!grant || grant.disabled) {
        return null;
      }
    }
    let allowedDomains: string[] = [];
    if (bean.allowedDomains) {
      try {
        const parsed = JSON.parse(bean.allowedDomains);
        if (!Array.isArray(parsed)) {
          throw new Error("not an array");
        }
        allowedDomains = parsed;
      } catch (e) {
        throw new ValidateException("EAB allowedDomains配置损坏，已拒绝操作");
      }
    }
    return { id: bean.id, allowedDomains };
  }

  async consumeAcmeEab(id: string, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(AcmeEabEntity) : this.acmeEabRepository;
    const metadata: any = repository.metadata;
    const usedCountColumn = metadata?.findColumnWithPropertyName?.("usedCount")?.databaseName || "used_count";
    const maxUsesColumn = metadata?.findColumnWithPropertyName?.("maxUses")?.databaseName || "max_uses";
    const disabledColumn = metadata?.findColumnWithPropertyName?.("disabled")?.databaseName || "disabled";
    const expiresColumn = metadata?.findColumnWithPropertyName?.("expiresTime")?.databaseName || "expires_time";
    const result = await repository
      .createQueryBuilder()
      .update()
      .set({ usedCount: () => `${usedCountColumn} + 1`, updateTime: new Date() })
      .where("id = :id", { id })
      .andWhere(`${disabledColumn} = :disabled`, { disabled: false })
      .andWhere(`(${expiresColumn} IS NULL OR ${expiresColumn} > :now)`, { now: Date.now() })
      .andWhere(`(${maxUsesColumn} = 0 OR ${usedCountColumn} < ${maxUsesColumn})`)
      .execute();
    return (result.affected || 0) > 0;
  }
  /** 授权撤销时联动禁用绑定EAB，属于ACME集成职责。 */
  async disableEabsByGrantIds(grantIds: number[]) {
    if (!grantIds?.length) return;
    await this.acmeEabRepository.update({ grantId: In(grantIds) }, { disabled: true, updateTime: new Date() } as any);
  }

}