import { ALL, Body, Controller, Get, Inject, Post, Provide, Query } from "@midwayjs/core";
import { Constants, CrudController, PermissionException, ValidateException } from "@certd/lib-server";
import { cache } from "@certd/basic";
import { ApiTags } from "@midwayjs/swagger";
import { LocalCaService } from "../service/local-ca-service.js";
import { AcmeServerService } from "../../acme-server/service/acme-server-service.js";
import { AuditType } from "../../sys/enterprise/service/audit-constants.js";

@Provide()
@Controller("/api/sys/local-ca")
@ApiTags(["cert"])
export class LocalCaController extends CrudController<LocalCaService> {
  @Inject()
  service: LocalCaService;

  @Inject()
  acmeServerService: AcmeServerService;

  getService(): LocalCaService {
    return this.service;
  }

  getAuditType(): string {
    return AuditType.localCa.value;
  }

  @Post("/page", { description: Constants.per.authOnly, summary: "查询本地CA分页列表" })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    const userId = this.getUserId();
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
        bq.andWhere("id IN (SELECT ca_id FROM cd_local_ca_admin WHERE admin_user_id = :adminUserId)", { adminUserId: userId });
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
          bq.andWhere("main.disabled = 0 AND main.rotated_to_id IS NULL");
        } else if (status === "rotated") {
          bq.andWhere("main.rotated_to_id IS NOT NULL");
        } else if (status === "disabled") {
          bq.andWhere("main.disabled = 1 AND main.rotated_to_id IS NULL");
        }
      },
    });
    return this.ok(res);
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询本地CA列表" })
  async list(@Body(ALL) body: any) {
    const userId = this.getUserId();
    const list = await this.service.listSafe({
      adminUserId: userId,
      searchKey: body?.searchKey,
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
    });
    this.auditLog({ content: `更新了本地CA的ACME访问控制(ID:${body.id})` });
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
    const userId = this.getUserId();
    return this.ok(await this.service.listAdminOptions({ adminUserId: userId, searchKey: body?.searchKey }));
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
      grantId: body.grantId,
      remark: body.remark,
      privileged: body.privileged === true,
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

  @Post("/eab/privileged", { description: Constants.per.authOnly, summary: "变更EAB特权（升级需CA所有者，需2FA/Passkey）" })
  async setEabPrivileged(@Body(ALL) body: any) {
    if (typeof body.privileged !== "boolean") {
      throw new ValidateException("privileged必须是布尔值");
    }
    this.assertStepUp(body.verifyToken, "变更EAB特权");
    const userId = this.getUserId();
    await this.checkCaAccess(body.caId, "write", body.privileged === true);
    const res = await this.service.setAcmeEabPrivileged({
      caId: body.caId,
      eabId: body.eabId,
      userId,
      privileged: body.privileged === true,
    });
    this.auditLog({ content: `${body.privileged ? "升级为特权" : "降级为普通"}EAB凭证(ID:${body.eabId})` });
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
    this.assertStepUp(body.verifyToken, "授权用户使用中间CA");
    const userId = this.getUserId();
    const res = await this.service.addGrant({ id: body.id, userId, grantUserId: body.grantUserId, grantProjectId: body.grantProjectId });
    const projectMode = body.grantProjectId != null && body.grantProjectId !== 0;
    this.auditLog({ content: projectMode ? `授权项目(ID:${body.grantProjectId})内全部用户使用本地CA(ID:${body.id})` : `授权用户(ID:${body.grantUserId})使用本地CA(ID:${body.id})，全部项目` });
    return this.ok(res);
  }

  @Post("/grants/remove", { description: Constants.per.authOnly, summary: "移除CA用户授权" })
  async removeGrant(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "移除CA用户授权");
    const userId = this.getUserId();
    await this.service.removeGrant({ id: body.id, userId, grantId: body.grantId });
    this.auditLog({ content: `移除本地CA(ID:${body.id})的用户授权(ID:${body.grantId})` });
    return this.ok(true);
  }

  @Post("/admins/list", { description: Constants.per.authOnly, summary: "查询CA管理员" })
  async listAdmins(@Body(ALL) body: any) {
    const { userId } = await this.checkCaAccess(body.id, "read", false, true);
    return this.ok(await this.service.listAdmins({ id: body.id, userId }));
  }

  @Post("/admins/add", { description: Constants.per.authOnly, summary: "添加CA管理员" })
  async addAdmin(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "添加CA管理员");
    const userId = this.getUserId();
    const res = await this.service.addCaAdmin({ id: body.id, userId, adminUserId: body.adminUserId, role: body.role });
    this.auditLog({ content: `添加本地CA(ID:${body.id})管理员(ID:${body.adminUserId})` });
    return this.ok(res);
  }

  @Post("/admins/remove", { description: Constants.per.authOnly, summary: "移除CA管理员" })
  async removeAdmin(@Body(ALL) body: any) {
    this.assertStepUp(body.verifyToken, "移除CA管理员");
    const userId = this.getUserId();
    await this.service.removeCaAdmin({ id: body.id, userId, adminUserId: body.adminUserId });
    this.auditLog({ content: `移除本地CA(ID:${body.id})管理员(ID:${body.adminUserId})` });
    return this.ok(true);
  }

  private async checkCaAccess(id: number, mode: "read" | "write" = "read", requireOwner = false, includeDeleted = false) {
    // 企业场景：分公司维护员可为非系统管理员的CA owner/operator，边界由CA ACL判定
    const userId = this.getUserId();
    await this.service.assertAdminCa(id, userId, requireOwner, includeDeleted);
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
