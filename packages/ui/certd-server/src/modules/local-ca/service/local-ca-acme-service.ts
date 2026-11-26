import crypto from "node:crypto";
import { logger } from "@certd/basic";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { AccessService, EncryptService, SysSettingsService, ValidateException } from "@certd/lib-server";
import { runTransaction } from "../../db/db-transaction.js";
import { LocalCaEntity } from "../entity/local-ca.js";
import { LocalCaGrantEntity } from "../entity/local-ca-grant.js";
import { AcmeAccountEntity, AcmeEabEntity, AcmeOrderEntity } from "../../acme-server/entity/acme-server.js";
import { normalizeIpAllowlist, normalizeRequiredHeaders } from "../../acme-server/protocol/acme-access.js";
import bcrypt from "bcryptjs";
import { randomId } from "../../acme-server/protocol/acme-jws.js";
import { LocalCaAccessService, LocalCaScope } from "./local-ca-access-service.js";
import { LocalCaCrlService } from "./local-ca-crl-service.js";
import { LocalCaProviderSyncService } from "./local-ca-provider-sync-service.js";
import { normalizeAllowedDomains, sha256Hex } from "./local-ca-crypto.js";
import { localCaMutex, caConfigKey } from "./local-ca-mutex.js";
import { CertInfoService } from "../../monitor/service/cert-info-service.js";

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

  @Inject()
  providerSync: LocalCaProviderSyncService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  sysAccessService: AccessService;

  @Inject()
  certInfoService: CertInfoService;

  /** 解析EAB所属CA链对应的自定义ACME颁发机构sslProvider（供普通用户自助注册账号）。 */
  private async resolveSslProvider(caId: number, providerList: any[]): Promise<string | null> {
    const chain = await this.accessService.collectRotationChain(caId);
    const chainSet = new Set(chain.map(id => Number(id)));
    const entry = providerList.find(item => item.localCaId != null && chainSet.has(Number(item.localCaId)));
    return entry?.sslProvider || null;
  }

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
    let ca = await repository.findOne({ where: { id } });
    // CA不存在或已归档且未轮换：不再提供ACME，返回null由调用方给出明确业务错误（避免访问null.id泄露堆栈）
    if (!ca || (ca.deleted && !ca.rotatedToId)) {
      return null;
    }
    const visited = new Set<number>([ca.id]);
    while (ca?.rotatedToId && !visited.has(ca.rotatedToId)) {
      const next = await repository.findOne({ where: { id: ca.rotatedToId, deleted: false } });
      if (!next) break;
      visited.add(next.id);
      ca = next;
    }
    return ca;
  }

  /** 访问控制原始视图（不做usable断言），供ACME访问门禁判断总开关/白名单。 */
  async getAcmeAccessView(id: number) {
    return await this.resolveEffectiveAcmeCa(id);
  }

  /**
   * 吊销接口允许CA已禁用：否则CA关闭后其历史证书将无法撤销，也无法安全归档删除。
   */
  async getCaForAcmeRevocation(id: number) {
    // 吊销历史证书不受归档/禁用限制：密钥退役后仍须保证已签发证书可吊销
    const ca = await this.repository.findOne({ where: { id } });
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
    const lockOpt = useLock ? { lock: { mode: "pessimistic_write" as const } } : {};
    // 与resolveEffectiveAcmeCa一致：先读原始CA（允许已归档但已轮换的旧CA），再沿rotatedToId解析到有效CA，
    // 避免旧CA归档后新订单可创建却无法finalize；用visited防环，不限制轮换代数
    let ca = await repository.findOne({ where: { id }, ...lockOpt });
    if (ca?.deleted && !ca.rotatedToId) {
      ca = null;
    }
    const visited = new Set<number>(ca ? [ca.id] : []);
    while (ca?.rotatedToId && !visited.has(ca.rotatedToId)) {
      const next = await repository.findOne({ where: { id: ca.rotatedToId, deleted: false }, ...lockOpt });
      if (!next) break;
      visited.add(next.id);
      ca = next;
    }
    this.assertAcmeCaUsable(ca);
    await this.crlService.assertCaNotRevokedByParent(ca);
    return ca;
  }

  async setAcmeEnabled(req: LocalCaScope & { enabled: boolean; validityDays?: number; mode?: "local" | "standard" }) {
    const ca = await this.accessService.getOwnedCa(req);
    if (ca.caType !== "intermediate") {
      throw new ValidateException("只有中间CA可以启用ACME服务");
    }
    if (!req.enabled) {
      // 关闭ACME时原子关闭直签并失效未完成直签订单，避免重新启用后旧订单复活
      await this.invalidateAllDirectOrders(ca, true);
      ca.acmeEnabled = false;
      await this.providerSync.removeForCa(ca.id).catch(e => logger.error(`[local-ca] provider sync remove failed ca=${ca.id}: ${e?.message || e}`));
      logger.info(`[local-ca] acme disabled ca=${ca.id} user=${req.userId} project=${req.projectId ?? "-"}`);
      return;
    }
    ca.acmeEnabled = true;
    await localCaMutex.runExclusive(caConfigKey(ca.id), async () => {
      const config = this.readAcmeConfigObject(ca.acmeConfig);
      if (req.validityDays) {
        config.validityDays = Math.max(1, Math.min(3650, req.validityDays));
      }
      // 三档模式：关闭=acmeEnabled false；仅本地=local（回环IP或内部凭证）；标准=standard（完整门禁）。
      // 未传mode时保留原配置，legacy数据缺省按standard（兼容旧行为）
      if (req.mode === "local" || req.mode === "standard") {
        config.acmeMode = req.mode;
      }
      if (this.resolveAcmeMode(config) === "local" && !config.internalToken) {
        config.internalToken = crypto.randomBytes(24).toString("base64url");
      }
      ca.acmeConfig = JSON.stringify(config);
      ca.updateTime = new Date();
      await this.repository.save(ca);
    });
    await this.providerSync.syncForCa(ca.id).catch(e => logger.error(`[local-ca] provider sync failed ca=${ca.id}: ${e?.message || e}`));
    logger.info(`[local-ca] acme enabled ca=${ca.id} mode=${this.resolveAcmeMode(this.readAcmeConfigObject(ca.acmeConfig))} user=${req.userId} project=${req.projectId ?? "-"}`);
  }

  /**
   * 轮换仅本地档内部凭证（internalToken）。
   * 旧凭证立即失效，正在使用旧凭证的流水线需重新获取；用于凭证泄露后的应急处置。
   */
  async rotateInternalToken(req: LocalCaScope & { caId: number }) {
    const ca = await this.accessService.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId }, true);
    if (ca.caType !== "intermediate") {
      throw new ValidateException("只有中间CA可以轮换内部凭证");
    }
    let token = "";
    await localCaMutex.runExclusive(caConfigKey(ca.id), async () => {
      const config = this.readAcmeConfigObject(ca.acmeConfig);
      if (this.resolveAcmeMode(config) !== "local") {
        throw new ValidateException("仅本地模式才有内部凭证，标准模式无需轮换");
      }
      token = crypto.randomBytes(24).toString("base64url");
      config.internalToken = token;
      ca.acmeConfig = JSON.stringify(config);
      ca.updateTime = new Date();
      await this.repository.save(ca);
    });
    await this.providerSync.syncForCa(ca.id).catch(e => logger.error(`[local-ca] provider sync failed ca=${ca.id}: ${e?.message || e}`));
    logger.info(`[local-ca] acme internal token rotated ca=${ca.id} user=${req.userId}`);
    return { internalToken: token };
  }

  /** 读取ACME模式：缺省standard（legacy兼容），仅local为仅本地档。 */
  resolveAcmeMode(config: any): "local" | "standard" {
    if (config?.acmeMode === "local") {
      return "local";
    }
    return "standard";
  }

  /**
   * 关闭EAB直签（或整个ACME服务）时在同一事务内失效尚未完成的直签订单。
   */
  private readAcmeConfigObject(value?: string): any {
    if (!value) {
      return {};
    }
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  /** 读取脱敏ACME访问控制配置（不回显密码哈希）。 */
  async getAcmeAccess(req: LocalCaScope & { caId: number }) {
    const ca = await this.accessService.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId });
    const config = this.readAcmeConfigObject(ca.acmeConfig);
    return {
      acmeEnabled: ca.acmeEnabled,
      acmeMode: this.resolveAcmeMode(config),
      clientIpSource: config.clientIpSource === "socket" || config.clientIpSource === "header" ? config.clientIpSource : "xff",
      clientIpHeader: config.clientIpHeader || "",
      trustProxyCidrs: Array.isArray(config.trustProxyCidrs) ? config.trustProxyCidrs : [],
      ipAllowlist: Array.isArray(config.ipAllowlist) ? config.ipAllowlist : [],
      basicAuth: { enabled: config.basicAuth?.enabled === true, username: config.basicAuth?.username || "" },
      requiredHeaders: Array.isArray(config.requiredHeaders) ? config.requiredHeaders : [],
    };
  }

  /** 设置ACME访问控制（IP白名单/Basic认证/自定义头），合并写入acmeConfig。 */
  async setAcmeAccess(
    req: LocalCaScope & {
      caId: number;
      ipAllowlist?: any;
      basicAuth?: { enabled?: boolean; username?: string; password?: string };
      requiredHeaders?: any;
      clientIpSource?: string;
      clientIpHeader?: string;
      trustProxyCidrs?: any;
    }
  ) {
    const ca = await this.accessService.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId });
    if (ca.caType !== "intermediate") {
      throw new ValidateException("只有中间CA可以配置ACME访问控制");
    }
    await localCaMutex.runExclusive(caConfigKey(ca.id), async () => {
      const config = this.readAcmeConfigObject(ca.acmeConfig);
      if (req.ipAllowlist !== undefined) {
        config.ipAllowlist = normalizeIpAllowlist(req.ipAllowlist);
      }
      if (req.requiredHeaders !== undefined) {
        config.requiredHeaders = normalizeRequiredHeaders(req.requiredHeaders);
      }
      if (req.clientIpSource !== undefined) {
        if (!["xff", "socket", "header"].includes(req.clientIpSource)) {
          throw new ValidateException("客户端IP来源不合法");
        }
        config.clientIpSource = req.clientIpSource;
      }
      if (req.clientIpHeader !== undefined) {
        const header = String(req.clientIpHeader || "").trim();
        if (header && !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(header)) {
          throw new ValidateException("客户端IP请求头名称不合法");
        }
        config.clientIpHeader = header;
      }
      if (req.trustProxyCidrs !== undefined) {
        config.trustProxyCidrs = normalizeIpAllowlist(req.trustProxyCidrs);
      }
      if (req.basicAuth !== undefined) {
        const enabled = req.basicAuth.enabled === true;
        const username = String(req.basicAuth.username || "").trim();
        const prev = config.basicAuth || {};
        let passwordHash = String(prev.passwordHash || "");
        if (enabled) {
          if (!username) {
            throw new ValidateException("启用Basic认证必须设置用户名");
          }
          // Basic认证凭证仅Base64编码非加密，HTTP下会明文传输：强制HTTPS访问地址（TLS反代对外地址）
          const baseUrl = String((await this.crlService.resolveBaseUrl(ca)) || "").trim();
          if (baseUrl && !/^https:\/\//i.test(baseUrl)) {
            throw new ValidateException(
              "启用Basic认证要求HTTPS访问地址：HTTP下用户名密码会明文传输（Base64不是加密）。请将Base URL配置为https对外地址（TLS反向代理场景填外部https地址），或改用IP白名单/自定义头控制访问。"
            );
          }
          if (req.basicAuth.password) {
            passwordHash = bcrypt.hashSync(String(req.basicAuth.password), 10);
          } else if (!passwordHash) {
            throw new ValidateException("启用Basic认证必须设置密码");
          }
        }
        config.basicAuth = { enabled, username: enabled ? username : "", passwordHash: enabled ? passwordHash : "" };
      }
      ca.acmeConfig = JSON.stringify(config);
      ca.updateTime = new Date();
      await this.repository.save(ca);
    });
    logger.info(`[local-ca] acme access updated ca=${ca.id} user=${req.userId}`);
    return await this.getAcmeAccess({ id: req.caId, userId: req.userId, projectId: req.projectId, caId: req.caId });
  }

  async invalidateAllDirectOrders(ca: LocalCaEntity, disableAcme = false) {
    const manager = this.repository.manager;
    if (!manager?.transaction) {
      throw new ValidateException("数据库事务不可用，无法失效直签订单");
    }
    await runTransaction(manager, async tx => {
      const caRepository = tx.getRepository(LocalCaEntity);
      const driverType = String(tx.connection?.options?.type || "");
      if (!driverType.includes("sqlite")) {
        await caRepository.findOne({ where: { id: ca.id }, lock: { mode: "pessimistic_write" as const } });
      }
      if (disableAcme) {
        await caRepository.update({ id: ca.id }, { acmeEnabled: false } as any);
      }
      const errorMessage = disableAcme ? "ACME服务已关闭，请重新创建订单" : "EAB直签已关闭，请重新创建订单";
      await tx.getRepository(AcmeOrderEntity).update({ caId: ca.id, directIssue: true, status: In(["pending", "ready"]) }, { status: "invalid", error: errorMessage, updateTime: new Date() } as any);
    });
    logger.info(`[local-ca] ${disableAcme ? "acme disabled" : "direct orders invalidated"} ca=${ca.id}; unfinished direct orders invalidated`);
  }

  async createAcmeEab(req: Omit<LocalCaScope, "id"> & { caId: number; name: string; maxUses?: number; expiresDays?: number; allowedDomains?: string[]; grantId?: number; remark?: string; privileged?: boolean }) {
    const ca = await this.accessService.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId }, req.privileged === true);
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
      privileged: req.privileged === true,
      remark: String(req.remark || "").trim() || null,
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
    logger.info(`[local-ca] eab created ca=${ca.id} eab=${bean.id} kid=${kid} privileged=${bean.privileged} maxUses=${maxUses} allowedDomains=${allowedDomains.length}`);
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
      privileged: bean.privileged,
    };
  }

  async updateAcmeEab(req: Omit<LocalCaScope, "id"> & { caId: number; eabId: string; name?: string; remark?: string; allowedDomains?: string[]; maxUses?: number; expiresDays?: number }) {
    const ca = await this.accessService.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId });
    const bean = await this.acmeEabRepository.findOne({ where: { id: req.eabId, caId: ca.id } });
    if (!bean) {
      throw new ValidateException("EAB凭证不存在");
    }
    if (req.name !== undefined) {
      const name = String(req.name || "").trim();
      if (!name) {
        throw new ValidateException("凭证名称不能为空");
      }
      bean.name = name;
    }
    if (req.remark !== undefined) {
      bean.remark = String(req.remark || "");
    }
    if (req.allowedDomains !== undefined) {
      bean.allowedDomains = JSON.stringify(normalizeAllowedDomains(req.allowedDomains));
    }
    if (req.maxUses !== undefined) {
      bean.maxUses = Math.max(0, Number(req.maxUses) || 0);
    }
    if (req.expiresDays !== undefined) {
      const days = Math.max(0, Number(req.expiresDays) || 0);
      bean.expiresTime = days > 0 ? Date.now() + days * 86400000 : null;
    }
    bean.updateTime = new Date();
    await this.acmeEabRepository.save(bean);
    logger.info(`[local-ca] eab updated ca=${ca.id} eab=${bean.id} user=${req.userId}`);
    return bean;
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
      if (req.disabled === false && bean.revoked) {
        throw new ValidateException("该EAB已因泄漏被不可恢复禁用，不能重新启用，请创建新凭证");
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
      if (req.disabled === true && bean.privileged) {
        await this.invalidateDirectOrdersByEabIds(tx, [bean.id], "EAB凭证已禁用，请重新创建订单");
      }
      return { id: bean.id, disabled: bean.disabled };
    });
    logger.info(`[local-ca] eab ${result.disabled ? "disabled" : "enabled"} ca=${ca.id} eab=${result.id} user=${req.userId}`);
    return result;
  }

  async listAcmeEab(req: Omit<LocalCaScope, "id"> & { caId: number }) {
    // 只读管理列表允许归档CA（legacy凭证管理入口）
    const ca = await this.accessService.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId }, false, true);
    const chain = await this.accessService.collectRotationChain(ca.id);
    const chainCas = await this.repository.find({ where: { id: In(chain) } });
    const caNameMap = new Map(chainCas.map(item => [item.id, item.name]));
    const list = await this.acmeEabRepository.find({ where: { caId: In(chain) }, order: { createTime: "DESC" } });
    const eabIds = list.map(item => item.id);
    const accounts = eabIds.length ? await this.repository.manager.getRepository(AcmeAccountEntity).find({ where: { eabId: In(eabIds) }, select: { id: true, eabId: true, status: true } }) : [];
    const countByEab = new Map<string, number>();
    const riskByEab = new Map<string, number>();
    for (const acc of accounts) {
      if (acc.eabId) {
        countByEab.set(acc.eabId, (countByEab.get(acc.eabId) || 0) + 1);
        if (acc.status === "deactivated") {
          riskByEab.set(acc.eabId, (riskByEab.get(acc.eabId) || 0) + 1);
        }
      }
    }
    return list.map(item => ({
      id: item.id,
      caId: item.caId,
      caName: caNameMap.get(item.caId) || null,
      name: item.name,
      kid: item.kid,
      allowedDomains: item.allowedDomains,
      maxUses: item.maxUses,
      usedCount: item.usedCount,
      expiresTime: item.expiresTime,
      disabled: item.disabled,
      revoked: item.revoked === true,
      privileged: item.privileged === true,
      grantId: item.grantId,
      userId: item.userId,
      projectId: item.projectId,
      remark: item.remark,
      accountCount: countByEab.get(item.id) || 0,
      riskAccountCount: riskByEab.get(item.id) || 0,
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

  /** 普通用户“我的EAB”：按归属(用户/项目)过滤，并校验对所属CA仍有使用权；不回显hmacKey。 */
  async listMyEab(req: { userId: number; projectId?: number }) {
    const where: any[] = [];
    if (req.userId > 0) {
      where.push({ userId: req.userId });
    }
    if (req.projectId && req.projectId > 0) {
      where.push({ projectId: req.projectId });
    }
    if (where.length === 0) {
      return [];
    }
    const owned = await this.acmeEabRepository.find({ where, order: { createTime: "DESC" } });
    const privateSetting = await this.sysSettingsService.getPrivateSettings();
    const providerList = privateSetting.customAcmeProviders || [];
    const caNameCache = new Map<number, string>();
    const sslProviderCache = new Map<number, string | null>();
    const result: any[] = [];
    for (const item of owned) {
      if (item.disabled) {
        continue;
      }
      try {
        await this.accessService.getGrantedCa({ id: item.caId, userId: req.userId, projectId: req.projectId });
      } catch {
        continue;
      }
      if (!caNameCache.has(item.caId)) {
        const ca = await this.repository.findOne({ where: { id: item.caId } });
        caNameCache.set(item.caId, ca?.name || `#${item.caId}`);
      }
      if (!sslProviderCache.has(item.caId)) {
        sslProviderCache.set(item.caId, await this.resolveSslProvider(item.caId, providerList));
      }
      result.push({
        id: item.id,
        caId: item.caId,
        caName: caNameCache.get(item.caId),
        sslProvider: sslProviderCache.get(item.caId),
        name: item.name,
        kid: item.kid,
        allowedDomains: item.allowedDomains,
        maxUses: item.maxUses,
        usedCount: item.usedCount,
        expiresTime: item.expiresTime,
        disabled: item.disabled,
        privileged: item.privileged === true,
        remark: item.remark,
        createTime: item.createTime,
      });
    }
    return result;
  }

  /** 普通用户取回自己EAB的密钥（供自助注册ACME账号）；严格归属+使用权校验，勿复用无校验的getAcmeEabSecret。 */
  async getMyEabSecret(req: { userId: number; projectId?: number; eabId: string }) {
    const bean = await this.acmeEabRepository.findOne({ where: { id: req.eabId } });
    if (!bean) {
      throw new ValidateException("EAB凭证不存在");
    }
    const owns = (req.userId > 0 && bean.userId === req.userId) || (req.projectId && req.projectId > 0 && bean.projectId === req.projectId);
    if (!owns) {
      throw new ValidateException("无权访问该EAB凭证");
    }
    await this.accessService.getGrantedCa({ id: bean.caId, userId: req.userId, projectId: req.projectId });
    let hmacKey: string;
    try {
      hmacKey = this.encryptService.decrypt(bean.hmacKeyEncrypted);
    } catch {
      throw new ValidateException("EAB凭证密钥解密失败");
    }
    if (bean.hmacKeyHash && sha256Hex(hmacKey) !== bean.hmacKeyHash) {
      throw new ValidateException("EAB凭证密钥校验失败");
    }
    return { kid: bean.kid, hmacKey, caId: bean.caId };
  }

  /** 解析EAB所属CA链对应的颁发机构sslProvider（服务端内部使用）。 */
  async resolveEabSslProvider(caId: number) {
    const privateSetting = await this.sysSettingsService.getPrivateSettings();
    return await this.resolveSslProvider(caId, privateSetting.customAcmeProviders || []);
  }

  /** 导出当前用户自己的ACME账户供外部标准客户端使用；仅标准ACME模式允许，归属校验。 */
  async exportMyAccount(req: { userId: number; projectId?: number; accountId: string }) {
    const accountRepository = this.repository.manager.getRepository(AcmeAccountEntity);
    const account = await accountRepository.findOne({ where: { id: req.accountId } });
    if (!account) {
      throw new ValidateException("ACME账户不存在");
    }
    const owns = (req.userId > 0 && account.userId === req.userId) || (req.projectId && req.projectId > 0 && account.projectId === req.projectId);
    if (!owns) {
      throw new ValidateException("无权导出该ACME账户");
    }
    const ca = await this.getAcmeAccessView(account.caId);
    const config = this.readAcmeConfigObject(ca?.acmeConfig);
    if (this.resolveAcmeMode(config) !== "standard") {
      throw new ValidateException("仅标准ACME模式允许导出账户到外部客户端");
    }
    const accesses = await this.sysAccessService.repository.find({ where: { userId: req.userId, type: "acmeAccount" } });
    let acc: any = null;
    for (const item of accesses) {
      const setting = this.sysAccessService.decryptAccessEntity(item);
      const parsed = typeof setting.account === "string" ? JSON.parse(setting.account) : setting.account;
      if (parsed?.accountUri && String(parsed.accountUri).endsWith("/account/" + req.accountId)) {
        acc = parsed;
        break;
      }
    }
    if (!acc?.accountKey) {
      throw new ValidateException("未找到该账户的密钥配置，无法导出");
    }
    const eab = account.eabId ? await this.getMyEabSecret({ userId: req.userId, projectId: req.projectId, eabId: account.eabId }) : null;
    return {
      directoryUrl: acc.directoryUrl,
      accountUri: acc.accountUri,
      accountKey: acc.accountKey,
      email: acc.email,
      caType: acc.caType,
      eab: eab ? { kid: eab.kid, hmacKey: eab.hmacKey } : null,
    };
  }

  /** 普通用户“我的ACME账户”：按归属过滤并校验使用权。 */
  /** 列出某EAB注册的全部ACME账户（按注册时间升序），供泄漏处置甄别。 */
  async listEabAccounts(req: { caId: number; eabId: string; userId: number; projectId?: number }) {
    await this.accessService.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId }, false, true);
    const accountRepository = this.repository.manager.getRepository(AcmeAccountEntity);
    const accounts = await accountRepository.find({ where: { eabId: req.eabId }, order: { createTime: "ASC" } });
    const result: any[] = [];
    for (const account of accounts) {
      const orderCount = await this.acmeOrderRepository.count({ where: { accountId: account.id } });
      const issuedCount = await this.acmeOrderRepository.count({ where: { accountId: account.id, status: "valid" } });
      result.push({
        id: account.id,
        status: account.status,
        contact: account.contact ? JSON.parse(account.contact) : [],
        createTime: account.createTime,
        orderCount,
        issuedCount,
      });
    }
    return result;
  }

  /**
   * EAB泄漏应急处置：不可恢复禁用该EAB，批量停用选中账户并吊销其已签发证书。
   * 未选中的（确认安全的）账户保留可用（EAB只管注册，账户独立）。
   */
  async leakRevokeEab(req: { caId: number; eabId: string; accountIds: string[]; userId: number; projectId?: number }) {
    const ca = await this.accessService.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId }, true);
    const manager = this.repository.manager;
    if (!manager?.transaction) {
      throw new ValidateException("数据库事务不可用");
    }
    const accountIds = Array.isArray(req.accountIds) ? req.accountIds.filter(Boolean) : [];
    // 事务内：统一锁顺序 EAB→Account（与 finalize 一致），先锁EAB再锁账户，避免与签发交叉等待死锁
    await runTransaction(manager, async tx => {
      const driverType = String(tx.connection?.options?.type || "");
      const useRowLock = !driverType.includes("sqlite");
      const eabRepository = tx.getRepository(AcmeEabEntity);
      const eab = await eabRepository.findOne({
        where: { id: req.eabId, caId: ca.id },
        ...(useRowLock ? { lock: { mode: "pessimistic_write" as const } } : {}),
      });
      if (!eab) {
        throw new ValidateException("EAB凭证不存在或无访问权限");
      }
      eab.disabled = true;
      eab.revoked = true;
      eab.updateTime = new Date();
      await eabRepository.save(eab);
      const accountRepository = tx.getRepository(AcmeAccountEntity);
      for (const accountId of accountIds) {
        // 加行锁与finalize的账户锁串行化，确保停用与签发不会交错
        const account = await accountRepository.findOne({
          where: { id: accountId, eabId: req.eabId },
          ...(useRowLock ? { lock: { mode: "pessimistic_write" as const } } : {}),
        });
        if (!account) {
          continue;
        }
        account.status = "deactivated";
        account.updateTime = new Date();
        await accountRepository.save(account);
      }
    });
    // 收集选中账户已签发的有效订单，证书吊销由facade统一处理（复用轮换链查询与系统级证书CRL路径）
    const orders: any[] = [];
    const accountRepository = this.repository.manager.getRepository(AcmeAccountEntity);
    for (const accountId of accountIds) {
      const account = await accountRepository.findOne({ where: { id: accountId } });
      const accountOrders = await this.acmeOrderRepository.find({ where: { accountId, status: "valid" } });
      for (const order of accountOrders) {
        if (!order.serialNumber) {
          continue;
        }
        orders.push({
          caId: order.caId,
          serialNumber: order.serialNumber,
          certPem: order.certPem || null,
          userId: account?.userId ?? 0,
          projectId: account?.projectId,
          expiresTime: order.expiresTime,
        });
      }
    }
    logger.info(`[local-ca] eab leak disabled ca=${ca.id} eab=${req.eabId} accounts=${accountIds.length} orders=${orders.length} user=${req.userId}`);
    return { disabledAccounts: accountIds.length, orders };
  }

  async listMyAccounts(req: { userId: number; projectId?: number }) {
    const where: any[] = [];
    if (req.userId > 0) {
      where.push({ userId: req.userId });
    }
    if (req.projectId && req.projectId > 0) {
      where.push({ projectId: req.projectId });
    }
    if (where.length === 0) {
      return [];
    }
    const accountRepository = this.repository.manager.getRepository(AcmeAccountEntity);
    const accounts = await accountRepository.find({ where, order: { createTime: "DESC" } });
    const result: any[] = [];
    for (const account of accounts) {
      try {
        await this.accessService.getGrantedCa({ id: account.caId, userId: req.userId, projectId: req.projectId });
      } catch {
        continue;
      }
      const ca = await this.repository.findOne({ where: { id: account.caId } });
      const eab = account.eabId ? await this.acmeEabRepository.findOne({ where: { id: account.eabId } }) : null;
      // EAB实际可用性（禁用/过期/授权撤销均视为失效），供UI反映账户真实状态
      const eabActive = account.eabId ? !!(await this.getAcmeEabProfile(account.eabId)) : false;
      const orderCount = await this.acmeOrderRepository.count({ where: { accountId: account.id } });
      const issuedCount = await this.acmeOrderRepository.count({ where: { accountId: account.id, status: "valid" } });
      result.push({
        id: account.id,
        status: account.status,
        eabActive,
        contact: account.contact ? JSON.parse(account.contact) : [],
        caId: account.caId,
        caName: ca?.name || null,
        acmeMode: this.resolveAcmeMode(this.readAcmeConfigObject(ca?.acmeConfig)),
        eabId: account.eabId,
        eabKid: eab?.kid || null,
        eabName: eab?.name || null,
        userId: account.userId,
        projectId: account.projectId,
        createTime: account.createTime,
        orderCount,
        issuedCount,
      });
    }
    return result;
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
    return { id: bean.id, allowedDomains, privileged: bean.privileged === true };
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
    const eabs = await this.acmeEabRepository.find({ where: { grantId: In(grantIds) }, select: { id: true } });
    const eabIds = eabs.map(item => item.id);
    const manager = this.repository.manager;
    await runTransaction(manager, async tx => {
      await tx.getRepository(AcmeEabEntity).update({ grantId: In(grantIds) }, { disabled: true, updateTime: new Date() } as any);
      if (eabIds.length) {
        await this.invalidateDirectOrdersByEabIds(tx, eabIds, "用户授权已撤销，EAB凭证已禁用，请重新创建订单");
      }
    });
  }

  /** 变更EAB特权：升级需CA所有者；降级时失效该EAB未完成的直签订单。 */
  async setAcmeEabPrivileged(req: Omit<LocalCaScope, "id"> & { caId: number; eabId: string; privileged: boolean }) {
    if (typeof req.privileged !== "boolean") {
      throw new ValidateException("privileged必须是布尔值");
    }
    const ca = await this.accessService.getOwnedCa({ id: req.caId, userId: req.userId, projectId: req.projectId }, req.privileged === true);
    if (ca.caType !== "intermediate") {
      throw new ValidateException("只有中间CA可以管理ACME凭证");
    }
    const manager = this.repository.manager;
    if (!manager?.transaction) {
      throw new ValidateException("数据库事务不可用，无法变更EAB特权");
    }
    const result = await runTransaction(manager, async tx => {
      const repository = tx.getRepository(AcmeEabEntity);
      const driverType = String(tx.connection?.options?.type || "");
      const useLock = !driverType.includes("sqlite");
      const bean = await repository.findOne({ where: { id: req.eabId, caId: ca.id }, ...(useLock ? { lock: { mode: "pessimistic_write" as const } } : {}) });
      if (!bean) {
        throw new ValidateException("ACME凭证不存在或无访问权限");
      }
      if (req.privileged === true && bean.grantId) {
        const grant = await tx.getRepository(LocalCaGrantEntity).findOne({ where: { id: bean.grantId, caId: ca.id } });
        if (!grant || grant.disabled) {
          throw new ValidateException("关联用户授权已撤销，不能升级为特权EAB");
        }
      }
      const downgraded = bean.privileged === true && req.privileged === false;
      bean.privileged = req.privileged;
      bean.updateTime = new Date();
      await repository.save(bean);
      if (downgraded) {
        await this.invalidateDirectOrdersByEabIds(tx, [bean.id], "EAB特权已关闭，请重新创建订单");
      }
      return { id: bean.id, privileged: bean.privileged };
    });
    logger.info(`[local-ca] eab privileged=${result.privileged} ca=${ca.id} eab=${result.id} user=${req.userId}`);
    return result;
  }

  /** 失效指定EAB关联账户的未完成直签订单（经account.eab_id子查询，订单不冗余存eabId）。 */
  async invalidateDirectOrdersByEabIds(tx: EntityManager, eabIds: string[], message: string) {
    if (!eabIds.length) return;
    const orderRepository = tx.getRepository(AcmeOrderEntity);
    const metadata: any = orderRepository.metadata;
    const accountIdColumn = metadata?.findColumnWithPropertyName?.("accountId")?.databaseName || "account_id";
    const directIssueColumn = metadata?.findColumnWithPropertyName?.("directIssue")?.databaseName || "direct_issue";
    const statusColumn = metadata?.findColumnWithPropertyName?.("status")?.databaseName || "status";
    const accountRepository = tx.getRepository(AcmeAccountEntity);
    const accountMeta: any = accountRepository.metadata;
    const accountEabColumn = accountMeta?.findColumnWithPropertyName?.("eabId")?.databaseName || "eab_id";
    const accountIdPk = accountMeta?.findColumnWithPropertyName?.("id")?.databaseName || "id";
    const accountTable = accountMeta?.tablePath || "cd_acme_account";
    await orderRepository
      .createQueryBuilder()
      .update()
      .set({ status: "invalid", error: message, updateTime: new Date() } as any)
      .where(`${accountIdColumn} IN (SELECT ${accountIdPk} FROM ${accountTable} WHERE ${accountEabColumn} IN (:...eabIds))`, { eabIds })
      .andWhere(`${directIssueColumn} = :di`, { di: true })
      .andWhere(`${statusColumn} IN (:...statuses)`, { statuses: ["pending", "ready"] })
      .execute();
  }
}
