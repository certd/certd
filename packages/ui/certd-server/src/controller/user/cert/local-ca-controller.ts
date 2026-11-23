import { ALL, Body, Controller, Get, Inject, Post, Provide, Query } from "@midwayjs/core";
import { Constants, CrudController } from "@certd/lib-server";
import { cache } from "@certd/basic";
import { ApiTags } from "@midwayjs/swagger";
import { LocalCaService } from "../../../modules/cert/service/local-ca-service.js";
import { AcmeServerService } from "../../../modules/cert/service/acme-server-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

@Provide()
@Controller("/api/cert/local-ca")
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
    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query.userId = userId;
    body.query.projectId = projectId;
    const name = body.query.name;
    const subjectCn = body.query.subjectCn;
    if (!body.query.caType) {
      delete body.query.caType;
    }
    delete body.query.name;
    delete body.query.subjectCn;
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
      },
    });
    return this.ok(res);
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询本地CA列表" })
  async list(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    const list = await this.service.listSafe({
      userId,
      projectId,
      searchKey: body?.searchKey,
    });
    return this.ok(list);
  }

  @Post("/generate", { description: Constants.per.authOnly, summary: "生成根CA" })
  async generate(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdWrite();
    const res = await this.service.generateCa({
      userId,
      projectId,
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
    });
    this.auditLog({ content: `生成根CA「${body.name}」(ID:${res.id})` });
    return this.ok(res);
  }

  @Post("/import", { description: Constants.per.authOnly, summary: "导入根CA" })
  async import(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdWrite();
    const res = await this.service.importCa({
      userId,
      projectId,
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
    });
    this.auditLog({ content: `导入根CA「${body.name}」(ID:${res.id})` });
    return this.ok(res);
  }

  @Post("/intermediate", { description: Constants.per.authOnly, summary: "由根CA签发中间CA" })
  async intermediate(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdWrite();
    await this.checkOwner(this.service, body.rootId, "write");
    const res = await this.service.generateIntermediateCa({
      rootId: body.rootId,
      userId,
      projectId,
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
    });
    this.auditLog({ content: `根CA(ID:${body.rootId})签发中间CA「${body.name}」(ID:${res.id})` });
    return this.ok(res);
  }

  @Post("/info", { description: Constants.per.authOnly, summary: "查询本地CA详情" })
  async info(@Query("id") id: number) {
    const { userId, projectId } = await this.checkOwner(this.service, id, "read");
    return this.ok(await this.service.infoSafe({ id, userId, projectId }));
  }

  @Post("/update", { description: Constants.per.authOnly, summary: "修改本地CA信息" })
  async update(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkOwner(this.service, body.id, "write");
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
      acmeDirectIssue: body.acmeDirectIssue,
    });
    this.auditLog({ content: `修改了本地CA「${body.name}」(ID:${body.id})` });
    return this.ok(true);
  }

  @Post("/acme", { description: Constants.per.authOnly, summary: "启用/停用本地CA的ACME服务" })
  async acme(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkOwner(this.service, body.id, "write");
    await this.service.setAcmeEnabled({
      id: body.id,
      userId,
      projectId,
      enabled: body.enabled === true,
      validityDays: body.validityDays,
    });
    this.auditLog({ content: `${body.enabled ? "启用" : "停用"}了本地CA的ACME服务(ID:${body.id})` });
    return this.ok(true);
  }

  @Post("/disable", { description: Constants.per.authOnly, summary: "禁用/启用本地CA" })
  async disable(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkOwner(this.service, body.id, "write");
    await this.service.setDisabled({
      id: body.id,
      userId,
      projectId,
      disabled: body.disabled === true,
    });
    this.auditLog({ content: `${body.disabled ? "禁用" : "启用"}了本地CA(ID:${body.id})` });
    return this.ok(true);
  }

  @Post("/delete", { description: Constants.per.authOnly, summary: "删除本地CA" })
  async delete(@Query("id") id: number) {
    const { userId, projectId } = await this.checkOwner(this.service, id, "write");
    await this.service.deleteCa({ id, userId, projectId });
    this.auditLog({ content: `删除了本地CA(ID:${id})` });
    return this.ok(true);
  }

  @Post("/options", { description: Constants.per.authOnly, summary: "查询本地CA选项" })
  async options(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    return this.ok(
      await this.service.listOptions({
        userId,
        projectId,
        searchKey: body?.searchKey,
      })
    );
  }

  @Post("/getOptionsByIds", { description: Constants.per.authOnly, summary: "根据ID查询本地CA选项" })
  async getOptionsByIds(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
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
    this.ctx.set("Cache-Control", "public, max-age=300, must-revalidate");
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
    const { userId, projectId } = await this.checkOwner(this.service, body.id, "read");
    return this.ok(await this.service.getPublicKey({ id: body.id, userId, projectId }));
  }

  @Get("/crlInfo", { description: Constants.per.authOnly, summary: "查看本地CA的CRL解析结果" })
  async crlInfo(@Query("id") id: number) {
    const { userId, projectId } = await this.checkOwner(this.service, id, "read");
    return this.ok(await this.service.getCrlInfo({ id, userId, projectId }));
  }

  @Post("/acme/accounts", { description: Constants.per.authOnly, summary: "查询本地ACME账户" })
  async acmeAccounts(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkOwner(this.service, body.id, "read");
    return this.ok(await this.acmeServerService.listAccounts(body.id, userId, projectId));
  }

  @Post("/acme/accountOrders", { description: Constants.per.authOnly, summary: "查询本地ACME账户订单" })
  async acmeAccountOrders(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkOwner(this.service, body.id, "read");
    return this.ok(await this.acmeServerService.listAccountOrders(body.id, body.accountId, userId, projectId));
  }

  @Post("/acme/accountStatus", { description: Constants.per.authOnly, summary: "启用/停用本地ACME账户" })
  async acmeAccountStatus(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkOwner(this.service, body.id, "write");
    await this.acmeServerService.setAccountStatus(body.id, body.accountId, body.status, userId, projectId);
    this.auditLog({ content: `${body.status === "valid" ? "启用" : "停用"}了本地ACME账户(${body.accountId})` });
    return this.ok(true);
  }

  @Post("/eab/create", { description: Constants.per.authOnly, summary: "创建本地ACME的EAB凭证" })
  async createEab(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkOwner(this.service, body.caId, "write");
    const res = await this.service.createAcmeEab({
      caId: body.caId,
      userId,
      projectId,
      name: body.name,
      maxUses: body.maxUses,
      expiresDays: body.expiresDays,
      allowedDomains: body.allowedDomains,
    });
    this.auditLog({ content: `创建本地ACME EAB凭证「${res.name}」(KID:${res.kid})` });
    return this.ok(res);
  }

  @Post("/eab/list", { description: Constants.per.authOnly, summary: "查询本地ACME的EAB凭证" })
  async listEab(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkOwner(this.service, body.caId, "read");
    return this.ok(await this.service.listAcmeEab({ caId: body.caId, userId, projectId }));
  }

  @Post("/certs", { description: Constants.per.authOnly, summary: "查询本地CA签发的证书" })
  async certs(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkOwner(this.service, body.id, "read");
    const list = await this.service.listIssuedCerts({ id: body.id, userId, projectId });
    return this.ok(list);
  }

  @Post("/revokeCert", { description: Constants.per.authOnly, summary: "吊销本地CA签发的证书" })
  async revokeCert(@Body(ALL) body: any) {
    const { userId, projectId } = await this.checkOwner(this.service, body.id, "write");
    await this.service.revokeIssuedCert({ id: body.id, userId, projectId, certId: body.certId });
    this.auditLog({ content: `吊销了本地CA签发的证书(ID:${body.certId})` });
    return this.ok(true);
  }

  @Post("/export", { description: Constants.per.authOnly, summary: "导出本地CA证书和私钥（需2FA/Passkey）" })
  async export(@Body(ALL) body: { id: number; verifyToken: string }) {
    const tokenUserId = cache.get(`secret_access_2fa:${body.verifyToken}`);
    if (!body.verifyToken || tokenUserId !== this.getUserId()) {
      throw new Error("请先验证 2FA 或 Passkey 后再导出CA私钥");
    }
    const { userId, projectId } = await this.checkOwner(this.service, body.id, "read");
    const res = await this.service.exportCa({ id: body.id, userId, projectId });
    this.auditLog({ content: `导出了本地CA证书和私钥(ID:${body.id})` });
    return this.ok(res);
  }

  @Get("/download", { description: Constants.per.authOnly, summary: "下载本地CA证书" })
  async download(@Query("id") id: number) {
    const { userId, projectId } = await this.checkOwner(this.service, id, "read");
    const { filename, pem } = await this.service.getCaCertPem({ id, userId, projectId });
    this.ctx.set("Content-Disposition", `attachment; filename="${filename}"`);
    this.ctx.type = "application/x-pem-file";
    return pem;
  }
}
