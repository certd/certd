import { ALL, Body, Controller, Get, Inject, Post, Provide, Query } from "@midwayjs/core";
import { AccessGetter, AccessService, Constants, CrudController, isEnterprise, PermissionException, ValidateException } from "@certd/lib-server";
import { cache, http, logger, utils } from "@certd/basic";
import { newAccess } from "@certd/pipeline";
import { ApiTags } from "@midwayjs/swagger";
import { LocalCaService } from "../service/local-ca-service.js";
import { AcmeServerService } from "../../acme-server/service/acme-server-service.js";
import { TaskServiceBuilder, restrictServiceGetter } from "../../pipeline/service/getter/task-service-getter.js";
import { AuditType } from "../../sys/enterprise/service/audit-constants.js";

type GrantEnsureResult = { changed: boolean; grantId?: number; created: boolean; revived: boolean };

@Provide()
@Controller("/api/sys/local-ca")
@ApiTags(["cert"])
export class LocalCaController extends CrudController<LocalCaService> {
  @Inject()
  service: LocalCaService;

  @Inject()
  acmeServerService: AcmeServerService;

  @Inject()
  accessService: AccessService;

  @Inject()
  taskServiceBuilder: TaskServiceBuilder;

  getService(): LocalCaService {
    return this.service;
  }

  getAuditType(): string {
    return AuditType.localCa.value;
  }

  @Post("/page", { description: Constants.per.authOnly, summary: "查询本地CA分页列表" })
  async page(@Body(ALL) body: any) {
    this.assertSystemAdmin();
    body.query = body.query ?? {};
    const name = body.query.name;
    const subjectCn = body.query.subjectCn;
    const status = body.query.status;
    if (!body.query.caType) {
      delete body.query.caType;
    }
    delete body.query.name;
    delete body.query.subjectCn;
    delete body.query.status;
    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery: bq => {
        if (name) {
          bq.andWhere("(name like :name or subject_cn like :subjectCn)", {
            name: `%${name}%`,
            subjectCn: `%${name}%`,
          });
        }
        if (subjectCn) {
          bq.andWhere("subject_cn like :subjectCn", { subjectCn: `%${subjectCn}%` });
        }
        if (status === "normal") {
          bq.andWhere("main.disabled = false AND main.rotated_to_id IS NULL AND main.revoked = false");
        } else if (status === "rotated") {
          bq.andWhere("main.rotated_to_id IS NOT NULL");
        } else if (status === "disabled") {
          bq.andWhere("main.disabled = true AND main.rotated_to_id IS NULL AND main.revoked = false");
        } else if (status === "revoked") {
          bq.andWhere("main.revoked = true");
        }
      },
    });
    return this.ok(res);
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询本地CA列表" })
  async list(@Body(ALL) body: any) {
    this.assertSystemAdmin();
    const userId = this.getUserId();
    const list = await this.service.listSafe({
      adminUserId: userId,
      searchKey: body?.searchKey,
      includeAll: true,
    });
    return this.ok(list);
  }

  @Post("/generate", { description: Constants.per.authOnly, summary: "生成根CA" })
  async generate(@Body(ALL) body: any) {
    this.assertSystemAdmin();
    this.assertStepUp(body.verifyToken, "生成根CA");
    const userId = this.getUserId();
    const res = await this.service.generateCa({
      userId,
      name: body.name,
      subject: body.subject,
      keyType: body.keyType,
      validityYears: body.validityYears,
      usage: body.usage,
      allowedDomains: body.allowedDomains,
      maxValidityDays: body.maxValidityDays,
      baseUrl: body.baseUrl,
      remark: body.remark,
      exportDisabled: body.exportDisabled,
      dnsServer: body.dnsServer,
      notBefore: body.notBefore,
      notAfter: body.notAfter,
    });
    this.auditLog({ content: `生成根CA「${body.name}」(ID:${res.id})` });
    return this.ok(res);
  }

  @Post("/import", { description: Constants.per.authOnly, summary: "导入根CA" })
  async import(@Body(ALL) body: any) {
    this.assertSystemAdmin();
    this.assertStepUp(body.verifyToken, "导入CA私钥");
    const userId = this.getUserId();
    const res = await this.service.importCa({
      userId,
      parentId: body.parentId,
      name: body.name,
      certPem: body.certPem,
      privateKeyPem: body.privateKeyPem,
      usage: body.usage,
      allowedDomains: body.allowedDomains,
      maxValidityDays: body.maxValidityDays,
      baseUrl: body.baseUrl,
      remark: body.remark,
      exportDisabled: body.exportDisabled,
      allowDuplicate: body.allowDuplicate === true,
      allowExternalCrl: body.allowExternalCrl === true,
      dnsServer: body.dnsServer,
    });
    this.auditLog({ content: `经step-up验证，导入CA「${body.name}」(ID:${res.id})` });
    return this.ok(res);
  }

  @Post("/import/check", { description: Constants.per.authOnly, summary: "检查CA证书是否重复" })
  async checkImport(@Body(ALL) body: any) {
    this.assertSystemAdmin();
    const userId = this.getUserId();
    return this.ok(await this.service.checkImportDuplicate({ userId, parentId: body.parentId, certPem: body.certPem }));
  }

  @Post("/intermediate", { description: Constants.per.authOnly, summary: "由根CA签发中间CA" })
  async intermediate(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "创建中间CA");
    const userId = this.getUserId();
    await this.checkCaAccess(body.rootId, "write", true);
    const res = await this.service.generateIntermediateCa({
      rootId: body.rootId,
      userId,
      name: body.name,
      subject: body.subject,
      keyType: body.keyType,
      validityYears: body.validityYears,
      usage: body.usage,
      allowedDomains: body.allowedDomains,
      maxValidityDays: body.maxValidityDays,
      baseUrl: body.baseUrl,
      remark: body.remark,
      exportDisabled: body.exportDisabled,
      dnsServer: body.dnsServer,
      notBefore: body.notBefore,
      notAfter: body.notAfter,
    });
    this.auditLog({ content: `经step-up验证，根CA(ID:${body.rootId})签发中间CA「${body.name}」(ID:${res.id})` });
    return this.ok(res);
  }

  @Post("/intermediate/rotate", { description: Constants.per.authOnly, summary: "轮换中间CA（生成新中间CA并停用旧CA）" })
  async rotateIntermediate(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "轮换中间CA");
    const userId = this.getUserId();
    await this.checkCaAccess(body.id, "write", true);
    const res = await this.service.rotateIntermediateCa({
      id: body.id,
      userId,
      name: body.name,
      subject: body.subject,
      keyType: body.keyType,
      validityYears: body.validityYears,
    });
    this.auditLog({ content: `轮换中间CA(ID:${body.id})，新CA(ID:${res.id})` });
    return this.ok(res);
  }

  @Post("/info", { description: Constants.per.authOnly, summary: "查询本地CA详情" })
  async info(@Query("id") id: number) {
    const userId = this.getUserId();
    if (this.isAdmin()) {
      return this.ok(await this.service.infoSafe({ id, userId }));
    }
    const projectId = await this.getProjectId("read");
    return this.ok(await this.service.infoForUse({ id, userId, projectId }));
  }

  @Post("/update", { description: Constants.per.authOnly, summary: "修改本地CA信息" })
  async update(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkCaAccess(body.id, "write");
    const sensitive = await this.service.requiresStepUpForUpdate({
      id: body.id,
      userId,
      projectId,
      usage: body.usage,
      maxValidityDays: body.maxValidityDays,
      allowedDomains: body.allowedDomains,
      baseUrl: body.baseUrl,
      exportDisabled: body.exportDisabled,
      dnsServer: body.dnsServer,
      allowDirectSign: body.allowDirectSign,
    });
    if (sensitive) {
      this.assertStepUp(body.verifyToken, "修改本地CA安全策略");
    }
    await this.service.updateMeta({
      id: body.id,
      userId,
      projectId,
      name: body.name,
      remark: body.remark,
      usage: body.usage,
      maxValidityDays: body.maxValidityDays,
      allowedDomains: body.allowedDomains,
      baseUrl: body.baseUrl,
      exportDisabled: body.exportDisabled,
      dnsServer: body.dnsServer,
      allowDirectSign: body.allowDirectSign,
    });
    this.auditLog({ content: `修改了本地CA「${body.name}」(ID:${body.id})` });
    return this.ok(true);
  }

  @Post("/acme", { description: Constants.per.authOnly, summary: "启用/停用本地CA的ACME服务" })
  async acme(@Body(ALL) body: any) {
    if (body.enabled === true || body.validityDays != null) {
      this.assertStepUp(body.verifyToken, "启用或调整ACME服务");
    }
    const { userId, projectId } = await this.checkCaAccess(body.id, "write");
    await this.service.setAcmeEnabled({
      id: body.id,
      userId,
      projectId,
      enabled: body.enabled === true,
      validityDays: body.validityDays,
      mode: body.mode === "local" || body.mode === "standard" ? body.mode : undefined,
    });
    this.auditLog({ content: `${body.enabled ? "启用" : "停用"}了本地CA的ACME服务(ID:${body.id})` });
    return this.ok(true);
  }

  @Post("/acme/access/get", { description: Constants.per.authOnly, summary: "查询本地CA的ACME访问控制配置" })
  async getAcmeAccess(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkCaAccess(body.id, "read");
    return this.ok(await this.service.getAcmeAccess({ id: body.id, caId: body.id, userId, projectId }));
  }

  @Post("/acme/access", { description: Constants.per.authOnly, summary: "设置本地CA的ACME访问控制（IP白名单/Basic/自定义头，需2FA/Passkey）" })
  async setAcmeAccess(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "设置ACME访问控制");
    const { userId, projectId } = await this.checkCaAccess(body.id, "write");
    const res = await this.service.setAcmeAccess({
      id: body.id,
      caId: body.id,
      userId,
      projectId,
      ipAllowlist: body.ipAllowlist,
      basicAuth: body.basicAuth,
      requiredHeaders: body.requiredHeaders,
      clientIpSource: body.clientIpSource,
      clientIpHeader: body.clientIpHeader,
      trustProxyCidrs: body.trustProxyCidrs,
    });
    this.auditLog({ content: `更新了本地CA的ACME访问控制(ID:${body.id})` });
    return this.ok(res);
  }

  @Post("/acme/rotateToken", { description: Constants.per.authOnly, summary: "轮换仅本地ACME内部凭证（需CA所有者+2FA/Passkey）" })
  async rotateInternalToken(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "轮换ACME内部凭证");
    const { userId, projectId } = await this.checkCaAccess(body.id, "write", true);
    const res = await this.service.rotateInternalToken({ id: body.id, caId: body.id, userId, projectId });
    this.auditLog({ content: `轮换了本地CA的ACME内部凭证(ID:${body.id})` });
    return this.ok(res);
  }

  @Post("/eab/assignAccount", { description: Constants.per.authOnly, summary: "使用EAB注册本地ACME账户并分配给用户/项目（需2FA/Passkey）" })
  async assignEabAccount(@Body(ALL) body: any) {
    this.assertSystemAdmin();
    this.assertStepUp(body.verifyToken, "分配ACME账户");
    const adminUserId = this.getUserId();
    const eabId = String(body.eabId || "").trim();
    if (!eabId) {
      throw new ValidateException("EAB凭证不能为空");
    }
    const email = String(body.email || "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidateException("请填写正确的邮箱");
    }
    const targetType = body.targetType === "project" ? "project" : "user";
    const enterprise = isEnterprise();
    if (enterprise && targetType !== "project") {
      throw new ValidateException("企业模式下仅支持分配给项目");
    }
    if (!enterprise && targetType !== "user") {
      throw new ValidateException("非企业模式下仅支持分配给用户");
    }
    const targetUserId = Number(body.targetUserId) || 0;
    const targetProjectId = Number(body.targetProjectId) || 0;
    if (targetType === "user" && targetUserId <= 0) {
      throw new ValidateException("请选择用户");
    }
    if (targetType === "project" && targetProjectId <= 0) {
      throw new ValidateException("请选择项目");
    }
    const scopeUserId = targetType === "project" ? -1 : targetUserId;
    const scopeProjectId = targetType === "project" ? targetProjectId : undefined;
    const ensureGrant = body.ensureGrant !== false;
    const targetLabel = targetType === "project" ? `项目#${targetProjectId}` : `用户#${targetUserId}`;

    const eab = await this.service.getAcmeEabForAssign(eabId);
    // 幂等：同一EAB+同一目标已注册则直接返回，不重复注册、不消耗次数
    const accounts = await this.acmeServerService.listAccounts(eab.caId, adminUserId);
    const existing = (accounts || []).find(acc => {
      if (acc.eabId !== eab.id || Number(acc.userId) !== scopeUserId) {
        return false;
      }
      if (targetType === "project") {
        return Number(acc.projectId) === scopeProjectId;
      }
      return !acc.projectId;
    });
    let grantChange: GrantEnsureResult | null = null;
    if (existing) {
      // 先查询本地Access（可能失败），再做授权变更，避免查询异常时遗留授权
      const accessId = await this.findAssignedAccessId(scopeUserId, scopeProjectId, existing.id);
      try {
        if (ensureGrant) {
          grantChange = await this.ensureAssignGrant(eab.caId, adminUserId, targetType, targetUserId, scopeProjectId);
        } else {
          await this.assertActiveAssignGrant(eab.caId, adminUserId, targetType, targetUserId, scopeProjectId);
        }
      } catch (e: any) {
        await this.rollbackAssignGrant(eab.caId, adminUserId, grantChange);
        throw e;
      }
      this.auditLog({ content: `重复分配ACME账户（EAB:${eab.kid}，账户:${existing.id}，目标:${targetLabel}），未重复注册` });
      return this.ok({ accountId: existing.id, accessId, caId: eab.caId, kid: eab.kid, eabName: eab.name, targetLabel, userId: scopeUserId, projectId: scopeProjectId, alreadyAssigned: true, grantAdded: grantChange?.changed === true });
    }

    this.service.assertEabAssignCapacity(eab);
    const sslProvider = await this.service.resolveEabSslProvider(eab.caId);
    if (!sslProvider) {
      throw new ValidateException("该凭证对应的颁发机构不可用，请联系管理员");
    }
    let accountJson: string | undefined;
    let accountId: string | undefined;
    let saved: any;
    // 从Grant变更开始到账户归属/访问保存统一补偿边界：任一异常都撤销本次Grant变更
    try {
      if (ensureGrant) {
        grantChange = await this.ensureAssignGrant(eab.caId, adminUserId, targetType, targetUserId, scopeProjectId);
      } else {
        await this.assertActiveAssignGrant(eab.caId, adminUserId, targetType, targetUserId, scopeProjectId);
      }
      const secret = await this.service.getAcmeEabSecret(eab.caId, eab.kid);
      if (!secret) {
        throw new ValidateException("EAB凭证密钥校验失败");
      }
      const input = { caType: sslProvider, email, eabKid: secret.kid, eabHmacKey: secret.hmacKey };
      const accessGetter = new AccessGetter(scopeUserId, scopeProjectId, this.accessService.getById.bind(this.accessService));
      const serviceGetter = this.taskServiceBuilder.create({ userId: scopeUserId, projectId: scopeProjectId, pluginType: "acmeAccount" });
      const accessContext = { http, logger, utils, accessService: accessGetter, serviceGetter: restrictServiceGetter(serviceGetter), define: undefined } as any;
      const access = await newAccess("acmeAccount", input, accessGetter, accessContext);
      accountJson = await access.onRequest({ typeName: "acmeAccount", action: "onGenerateAccount", input, record: { id: 0, type: "acmeAccount", title: "" }, data: {} });
      accountId = this.parseAssignedAccountId(accountJson);
      await this.service.updateAcmeAccountOwner({ accountId, eabId: eab.id, eabCaId: eab.caId, userId: scopeUserId, projectId: scopeProjectId });
      const setting = { caType: sslProvider, email, eabKid: secret.kid, account: accountJson };
      const name = String(body.name || `${eab.name}-${email}`).slice(0, 100);
      saved = await this.accessService.add({ type: "acmeAccount", name, setting: JSON.stringify(setting), userId: scopeUserId, projectId: scopeProjectId });
    } catch (e: any) {
      if (accountJson && !accountId) {
        // 远端ACME账户可能已创建但无法解析账户ID，无法自动回滚归属，保留审计线索供人工核查
        logger.error(`[local-ca] EAB分配账户注册成功但账户ID解析失败，远端账户可能已创建，需人工核查 eab=${eab.kid} email=${email}`);
      }
      if (accountId) {
        await this.service.rollbackAcmeAccountAssignment(accountId).catch(() => undefined);
      }
      await this.rollbackAssignGrant(eab.caId, adminUserId, grantChange);
      if (/^使用EAB注册ACME账户失败/.test(String(e?.message || ""))) {
        throw e;
      }
      throw new ValidateException(`使用EAB注册ACME账户失败：${e?.message || e}`);
    }
    this.auditLog({ content: `使用EAB「${eab.name}」(KID:${eab.kid})注册ACME账户(${accountId})并分配给${targetLabel}${grantChange?.changed ? "，已补充CA使用权" : ""}` });
    return this.ok({ accountId, accessId: saved.id, caId: eab.caId, kid: eab.kid, eabName: eab.name, targetLabel, userId: scopeUserId, projectId: scopeProjectId, alreadyAssigned: false, grantAdded: grantChange?.changed === true });
  }

  private findAssignGrant(grants: any[], targetType: string, targetUserId: number, projectId?: number) {
    return (grants || []).find(g => (targetType === "project" ? Number(g.projectId) === Number(projectId) && Number(g.userId) === 0 : Number(g.userId) === targetUserId && Number(g.projectId) === 0));
  }

  private async getAssignGrant(caId: number, adminUserId: number, targetType: string, targetUserId: number, projectId?: number) {
    const grants = await this.service.listGrants({ id: caId, userId: adminUserId });
    return this.findAssignGrant(grants || [], targetType, targetUserId, projectId);
  }

  private async assertActiveAssignGrant(caId: number, adminUserId: number, targetType: string, targetUserId: number, projectId?: number) {
    const grant = await this.getAssignGrant(caId, adminUserId, targetType, targetUserId, projectId);
    if (!grant || grant.disabled) {
      throw new ValidateException("目标尚未获得该CA的有效授权，请勾选自动授权或先添加授权");
    }
  }

  private async ensureAssignGrant(caId: number, adminUserId: number, targetType: string, targetUserId: number, projectId?: number): Promise<GrantEnsureResult> {
    const existing = await this.getAssignGrant(caId, adminUserId, targetType, targetUserId, projectId);
    if (existing && !existing.disabled) {
      return { changed: false, grantId: existing.id, created: false, revived: false };
    }
    const grant = await this.service.addGrant({ id: caId, userId: adminUserId, ...(targetType === "project" ? { grantProjectId: projectId } : { grantUserId: targetUserId }) });
    return { changed: true, grantId: grant?.id ?? existing?.id, created: !existing, revived: existing?.disabled === true };
  }

  /** 分配流程失败时撤销本次新增授权；若只是恢复了历史禁用授权，则重新置为禁用。 */
  private async rollbackAssignGrant(caId: number, adminUserId: number, change: GrantEnsureResult | null) {
    if (!change?.changed || !change.grantId) {
      return;
    }
    try {
      if (change.created) {
        await this.service.removeGrant({ id: caId, userId: adminUserId, grantId: change.grantId, disableAccounts: false });
      } else if (change.revived) {
        await this.service.setGrantDisabledForCompensation({ caId, grantId: change.grantId, disabled: true });
      }
    } catch (e: any) {
      logger.error(`[local-ca] rollback assign grant failed ca=${caId} grant=${change.grantId}: ${e?.message || e}`);
    }
  }

  private async findAssignedAccessId(userId: number, projectId: number | undefined, accountId: string): Promise<number | null> {
    const where: any = { type: "acmeAccount", userId };
    if (projectId != null) {
      where.projectId = projectId;
    }
    const list = await this.accessService.repository.find({ where });
    for (const item of list) {
      if (projectId == null && item.projectId) {
        continue;
      }
      const setting: any = this.accessService.decryptAccessEntity(item);
      let account = setting?.account;
      if (typeof account === "string") {
        try {
          account = JSON.parse(account);
        } catch {
          account = null;
        }
      }
      if (account?.accountUri && String(account.accountUri).endsWith("/account/" + accountId)) {
        return item.id;
      }
    }
    return null;
  }

  private parseAssignedAccountId(accountJson: string): string {
    try {
      const account = JSON.parse(accountJson);
      const match = String(account?.accountUri || "").match(/\/account\/([A-Za-z0-9_-]+)\/?$/);
      if (match) {
        return match[1];
      }
    } catch {
      // fallthrough
    }
    throw new ValidateException("ACME账户注册结果解析失败，请联系管理员");
  }

  @Post("/eab/accounts", { description: Constants.per.authOnly, summary: "查询某EAB注册的ACME账户（按时间，供泄漏处置）" })
  async eabAccounts(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkCaAccess(body.caId, "read", false, true);
    return this.ok(await this.service.listEabAccounts({ caId: body.caId, eabId: body.eabId, userId, projectId }));
  }

  @Post("/eab/leakRevoke", { description: Constants.per.authOnly, summary: "EAB泄漏处置：不可恢复禁用EAB并批量停用账户、吊销证书（需2FA/Passkey）" })
  async eabLeakRevoke(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "EAB泄漏处置");
    const { userId, projectId } = await this.checkCaAccess(body.caId, "write", true);
    const res = await this.service.leakRevokeEab({ caId: body.caId, eabId: body.eabId, accountIds: body.accountIds, userId, projectId });
    this.auditLog({ content: `EAB泄漏处置(ID:${body.eabId})，停用账户${res.disabledAccounts}个，吊销证书${res.revokedCerts}张` });
    return this.ok(res);
  }

  @Post("/intermediate/revoke", { description: Constants.per.authOnly, summary: "吊销中间CA并刷新Root CRL" })
  async revokeIntermediate(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "吊销中间CA");
    const { userId, projectId } = await this.checkCaAccess(body.id, "write", true);
    const res = await this.service.revokeIntermediate({
      id: body.id,
      userId,
      projectId,
      reason: body.reason,
    });
    this.auditLog({ content: `吊销了中间CA(ID:${body.id})，序列号:${res.serialNumber}，Root CRL序号:${res.crlNumber}` });
    return this.ok(res);
  }

  @Post("/disable", { description: Constants.per.authOnly, summary: "禁用/启用本地CA" })
  async disable(@Body(ALL) body: any) {
    if (typeof body.disabled !== "boolean") {
      throw new ValidateException("disabled必须是布尔值");
    }
    if (body.disabled === false) {
      this.assertStepUp(body.verifyToken, "启用本地CA");
    }
    const { userId, projectId } = await this.checkCaAccess(body.id, "write");
    await this.service.setDisabled({
      id: body.id,
      userId,
      projectId,
      disabled: body.disabled === true,
    });
    this.auditLog({ content: `${body.disabled ? "禁用" : "启用"}了本地CA(ID:${body.id})` });
    return this.ok(true);
  }

  @Post("/archive", { description: Constants.per.authOnly, summary: "归档本地CA（软删除，管理员永久可查）" })
  async archive(@Query("id") id: number, @Body(ALL) body?: { id: number; verifyToken: string; force?: boolean }) {
    const targetId = body?.id ?? id;
    this.assertStepUp(body?.verifyToken, "归档本地CA");
    const { userId, projectId } = await this.checkCaAccess(targetId, "write", true);
    await this.service.archiveCa({ id: targetId, userId, projectId, force: body?.force === true });
    this.auditLog({ content: `${body?.force ? "强制" : ""}归档了本地CA(ID:${targetId})` });
    return this.ok(true);
  }

  @Post("/options", { description: Constants.per.authOnly, summary: "查询本地CA选项" })
  async options(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getUseScope();
    return this.ok(
      await this.service.listOptions({
        userId,
        projectId,
        searchKey: body?.searchKey,
      })
    );
  }

  @Post("/adminOptions", { description: Constants.per.authOnly, summary: "查询管理员本地CA选项" })
  async adminOptions(@Body(ALL) body: any) {
    // 非系统管理员无管理选项，返回空而非抛错，避免普通用户登录时触发权限错误提示
    if (!this.isAdmin()) {
      return this.ok([]);
    }
    const userId = this.getUserId();
    return this.ok(await this.service.listAdminOptions({ adminUserId: userId, searchKey: body?.searchKey, includeAll: true }));
  }

  @Post("/getOptionsByIds", { description: Constants.per.authOnly, summary: "根据ID查询本地CA选项" })
  async getOptionsByIds(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getUseScope();
    return this.ok(
      await this.service.getOptionsByIds({
        ids: body.ids,
        userId,
        projectId,
      })
    );
  }

  @Get("/crl", { description: Constants.per.guest, summary: "获取本地CA证书吊销列表（公开，供CDP访问）" })
  async crl(@Query("id") id: number, @Query("format") format?: string) {
    if (!id) {
      throw new Error("id is required");
    }
    const crl = await this.service.getCrl(id);
    this.ctx.set("Cache-Control", "no-cache, must-revalidate");
    if (format === "pem") {
      this.ctx.set("Content-Disposition", `attachment; filename="${crl.filename}.pem"`);
      this.ctx.type = "application/x-pem-file";
      return crl.pem;
    }
    this.ctx.type = "application/pkix-crl";
    return crl.der;
  }

  @Post("/publicKey", { description: Constants.per.authOnly, summary: "获取本地CA公钥" })
  async publicKey(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkCaAccess(body.id, "read");
    return this.ok(await this.service.getPublicKey({ id: body.id, userId, projectId }));
  }

  @Get("/crlInfo", { description: Constants.per.authOnly, summary: "查看本地CA的CRL解析结果" })
  async crlInfo(@Query("id") id: number) {
    const { userId, projectId } = await this.checkCaAccess(id, "read");
    return this.ok(await this.service.getCrlInfo({ id, userId, projectId }));
  }

  @Post("/acme/accounts", { description: Constants.per.authOnly, summary: "查询本地ACME账户" })
  async acmeAccounts(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkCaAccess(body.id, "read");
    return this.ok(await this.acmeServerService.listAccounts(body.id, userId, projectId));
  }

  @Post("/acme/accountOrders", { description: Constants.per.authOnly, summary: "查询本地ACME账户订单" })
  async acmeAccountOrders(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkCaAccess(body.id, "read");
    return this.ok(await this.acmeServerService.listAccountOrders(body.id, body.accountId, userId, projectId));
  }

  @Post("/acme/accountStatus", { description: Constants.per.authOnly, summary: "启用/停用本地ACME账户（启用需2FA/Passkey）" })
  async acmeAccountStatus(@Body(ALL) body: any) {
    if (body.status === "valid") {
      this.assertStepUp(body.verifyToken, "启用ACME账户");
    }
    const { userId, projectId } = await this.checkCaAccess(body.id, "write");
    await this.acmeServerService.setAccountStatus(body.id, body.accountId, body.status, userId, projectId);
    await this.service.syncAccessDisabledMarker({ caId: body.id, accountId: body.accountId });
    this.auditLog({ content: `${body.status === "valid" ? "启用" : "停用"}了本地ACME账户(${body.accountId})` });
    return this.ok(true);
  }

  @Post("/eab/create", { description: Constants.per.authOnly, summary: "创建本地ACME的EAB凭证" })
  async createEab(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "创建EAB凭证");
    const { userId, projectId } = await this.checkCaAccess(body.caId, "write");
    const res = await this.service.createAcmeEab({
      caId: body.caId,
      userId,
      projectId,
      name: body.name,
      maxUses: body.maxUses,
      expiresDays: body.expiresDays,
      allowedDomains: body.allowedDomains,
      remark: body.remark,
      privileged: body.privileged === true,
      mode: body.mode === "local" || body.mode === "standard" ? body.mode : undefined,
    });
    this.auditLog({ content: `创建本地ACME EAB凭证「${res.name}」(KID:${res.kid}, 类型:${body.privileged ? "特权" : "普通"})` });
    return this.ok(res);
  }

  @Post("/eab/update", { description: Constants.per.authOnly, summary: "编辑本地ACME的EAB凭证（需2FA/Passkey）" })
  async updateEab(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "编辑ACME凭证");
    const { userId, projectId } = await this.checkCaAccess(body.caId, "write");
    const res = await this.service.updateAcmeEab({
      caId: body.caId,
      eabId: body.eabId,
      userId,
      projectId,
      name: body.name,
      remark: body.remark,
      allowedDomains: body.allowedDomains,
      maxUses: body.maxUses,
      expiresDays: body.expiresDays,
    });
    this.auditLog({ content: `编辑了本地CA的ACME EAB凭证(ID:${body.eabId})` });
    return this.ok(res);
  }

  @Post("/eab/status", { description: Constants.per.authOnly, summary: "启用/禁用本地ACME的EAB凭证（需2FA/Passkey）" })
  async setEabStatus(@Body(ALL) body: any) {
    if (typeof body.disabled !== "boolean") {
      throw new ValidateException("disabled必须是布尔值");
    }
    this.assertStepUp(body.verifyToken, "变更ACME凭证状态");
    const userId = this.getUserId();
    await this.checkCaAccess(body.caId, "write");
    const res = await this.service.setAcmeEabDisabled({
      caId: body.caId,
      eabId: body.eabId,
      userId,
      disabled: body.disabled === true,
    });
    this.auditLog({ content: `${body.disabled ? "禁用" : "启用"}了本地CA的ACME EAB凭证(ID:${body.eabId})` });
    return this.ok(res);
  }

  @Post("/eab/list", { description: Constants.per.authOnly, summary: "查询本地ACME的EAB凭证" })
  async listEab(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkCaAccess(body.caId, "read", false, true);
    return this.ok(await this.service.listAcmeEab({ caId: body.caId, userId, projectId }));
  }

  @Post("/certs", { description: Constants.per.authOnly, summary: "查询本地CA签发的证书" })
  async certs(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkCaAccess(body.id, "read");
    const list = await this.service.listIssuedCerts({ id: body.id, userId, projectId });
    return this.ok(list);
  }

  @Post("/certBySerial", { description: Constants.per.authOnly, summary: "按序列号查询证书PEM（查看证书信息）" })
  async certBySerial(@Body(ALL) body: any) {
    const { userId } = await this.checkCaAccess(body.id, "read", false, true);
    const certPem = await this.service.getCertPemBySerial({ id: body.id, userId, serial: body.serial });
    return this.ok({ certPem });
  }

  @Post("/revokeCert", { description: Constants.per.authOnly, summary: "吊销本地CA签发的证书" })
  async revokeCert(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "吊销本地CA证书");
    // 归档CA保留紧急吊销能力
    const { userId, projectId } = await this.checkCaAccess(body.id, "write", false, true);
    await this.service.revokeIssuedCert({ id: body.id, userId, projectId, certId: body.certId });
    this.auditLog({ content: `吊销了本地CA签发的证书(ID:${body.certId})` });
    return this.ok(true);
  }

  @Post("/grants/list", { description: Constants.per.authOnly, summary: "查询CA用户授权" })
  async listGrants(@Body(ALL) body: any) {
    const { userId } = await this.checkCaAccess(body.id, "read", false, true);
    return this.ok(await this.service.listGrants({ id: body.id, userId }));
  }

  @Post("/grants/add", { description: Constants.per.authOnly, summary: "授权用户使用中间CA" })
  async addGrant(@Body(ALL) body: any) {
    this.assertSystemAdmin();
    this.assertStepUp(body.verifyToken, "授权用户使用中间CA");
    const userId = this.getUserId();
    const res = await this.service.addGrant({ id: body.id, userId, grantUserId: body.grantUserId, grantProjectId: body.grantProjectId });
    const projectMode = body.grantProjectId != null && body.grantProjectId !== 0;
    this.auditLog({ content: projectMode ? `授权项目(ID:${body.grantProjectId})内全部用户使用本地CA(ID:${body.id})` : `授权用户(ID:${body.grantUserId})使用本地CA(ID:${body.id})，全部项目` });
    return this.ok(res);
  }

  @Post("/grants/remove", { description: Constants.per.authOnly, summary: "移除CA用户授权" })
  async removeGrant(@Body(ALL) body: any) {
    this.assertSystemAdmin();
    this.assertStepUp(body.verifyToken, "移除CA用户授权");
    const userId = this.getUserId();
    const res = await this.service.removeGrant({ id: body.id, userId, grantId: body.grantId, disableAccounts: body.disableAccounts === true });
    const extra = body.disableAccounts === true ? `；同时停用ACME账户${res.disabledAccounts}个，标记授权${res.markedAccess}个` : "";
    this.auditLog({ content: `移除本地CA(ID:${body.id})的用户授权(ID:${body.grantId})${extra}` });
    return this.ok(res);
  }

  @Post("/admins/list", { description: Constants.per.authOnly, summary: "查询CA管理员" })
  async listAdmins(@Body(ALL) body: any) {
    const { userId } = await this.checkCaAccess(body.id, "read", false, true);
    return this.ok(await this.service.listAdmins({ id: body.id, userId }));
  }

  @Post("/admins/add", { description: Constants.per.authOnly, summary: "添加CA管理员" })
  async addAdmin(@Body(ALL) body: any) {
    this.assertSystemAdmin();
    this.assertStepUp(body.verifyToken, "添加CA管理员");
    const userId = this.getUserId();
    const res = await this.service.addCaAdmin({ id: body.id, userId, adminUserId: body.adminUserId, role: body.role });
    this.auditLog({ content: `添加本地CA(ID:${body.id})管理员(ID:${body.adminUserId})` });
    return this.ok(res);
  }

  @Post("/admins/remove", { description: Constants.per.authOnly, summary: "移除CA管理员" })
  async removeAdmin(@Body(ALL) body: any) {
    this.assertSystemAdmin();
    this.assertStepUp(body.verifyToken, "移除CA管理员");
    const userId = this.getUserId();
    await this.service.removeCaAdmin({ id: body.id, userId, adminUserId: body.adminUserId });
    this.auditLog({ content: `移除本地CA(ID:${body.id})管理员(ID:${body.adminUserId})` });
    return this.ok(true);
  }

  private async checkCaAccess(id: number, mode: "read" | "write" = "read", requireOwner = false, includeDeleted = false) {
    // 本地CA管理收敛为系统管理员-only；普通用户仅经授权(grants)使用，不能管理/查看/修改CA设置
    this.assertSystemAdmin();
    const userId = this.getUserId();
    return { userId, projectId: undefined as number | undefined };
  }

  /**
   * Ordinary-user entry points (plugin options/info): use the real login user and project scope.
   */
  private async getUseScope() {
    const userId = this.getUserId();
    const projectId = await this.getProjectId("read");
    return { userId, projectId };
  }

  private assertSystemAdmin() {
    if (!this.isAdmin()) {
      throw new PermissionException("仅系统管理员可以管理本地CA");
    }
  }

  private assertStepUp(verifyToken: string | undefined, action: string) {
    const tokenUserId = verifyToken ? cache.get(`secret_access_2fa:${verifyToken}`) : undefined;
    const issuedAt = verifyToken ? cache.get(`secret_access_2fa_ts:${verifyToken}`) : undefined;
    // 敏感操作要求10秒内的新鲜验证令牌，避免复用旧令牌绕过二次确认
    const fresh = typeof issuedAt === "number" && Date.now() - issuedAt <= 10 * 1000;
    if (!verifyToken || tokenUserId !== this.getUserId() || !fresh) {
      throw new Error(`为保障安全，${action}前请重新完成 2FA 或 Passkey 验证，并在验证后 10 秒内提交操作`);
    }
    // 一次性消费：敏感操作每次均需新鲜验证，防止10秒窗口内令牌重放
    cache.delete(`secret_access_2fa:${verifyToken}`);
    cache.delete(`secret_access_2fa_ts:${verifyToken}`);
  }

  @Post("/crl/refresh", { description: Constants.per.authOnly, summary: "显式刷新Root CRL（需2FA/Passkey）" })
  async refreshCrl(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "刷新Root CRL");
    const { userId, projectId } = await this.checkCaAccess(body.id, "write", true);
    const res = await this.service.refreshRootCrl({ id: body.id, userId, projectId });
    this.auditLog({ content: `刷新了Root CRL(ID:${body.id})，CRL序号:${res.crlNumber}` });
    return this.ok(res);
  }

  @Post("/archived/roots", { description: Constants.per.authOnly, summary: "查询已归档CA" })
  async archivedRoots() {
    this.assertSystemAdmin();
    const userId = this.getUserId();
    return this.ok(await this.service.listArchivedRoots({ userId }));
  }

  @Post("/archived/info", { description: Constants.per.authOnly, summary: "查询已归档CA详情" })
  async archivedInfo(@Body(ALL) body: any) {
    this.assertSystemAdmin();
    const userId = this.getUserId();
    return this.ok(await this.service.getArchivedCaInfo({ id: body.id, userId }));
  }

  @Post("/crl/refreshArchived", { description: Constants.per.authOnly, summary: "刷新已归档Root CA的CRL（需2FA/Passkey）" })
  async refreshArchivedCrl(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "刷新已归档Root CRL");
    const { userId, projectId } = await this.checkCaAccess(body.id, "write", true);
    const res = await this.service.refreshArchivedRootCrl({ id: body.id, userId, projectId });
    this.auditLog({ content: `经step-up验证，刷新了归档Root CRL(ID:${body.id})，CRL序号:${res.crlNumber}` });
    return this.ok(res);
  }

  @Post("/export", { description: Constants.per.authOnly, summary: "导出本地CA证书和私钥（需2FA/Passkey）" })
  async export(@Body(ALL) body: { id: number; verifyToken: string }) {
    this.assertStepUp(body.verifyToken, "导出CA私钥");
    const { userId, projectId } = await this.checkCaAccess(body.id, "write", true);
    const res = await this.service.exportCa({ id: body.id, userId, projectId });
    this.auditLog({ content: `导出了本地CA证书和私钥(ID:${body.id})` });
    return this.ok(res);
  }

  @Get("/download", { description: Constants.per.authOnly, summary: "下载本地CA证书" })
  async download(@Query("id") id: number) {
    const { userId, projectId } = await this.checkCaAccess(id, "read");
    const { filename, pem } = await this.service.getCaCertPem({ id, userId, projectId });
    this.ctx.set("Content-Disposition", `attachment; filename="${filename}"`);
    this.ctx.type = "application/x-pem-file";
    return pem;
  }
}
