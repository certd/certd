import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { BaseController } from "@certd/lib-server";
import { RegisterInviteService } from "../../../modules/login/service/register-invite-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

/**
 * 注册邀请管理（仅系统管理员）。
 * 生成时返回一次性明文 token（仅此一次）；列表隐藏已过期且未使用的链接。
 */
@Provide()
@Controller("/api/sys/register-invite")
export class RegisterInviteController extends BaseController {
  @Inject()
  service: RegisterInviteService;

  getAuditType(): string {
    return AuditType.settings.value;
  }

  private assertAdmin() {
    if (!this.isAdmin()) {
      throw new Error("仅系统管理员可管理注册邀请");
    }
  }

  @Post("/list", { description: "sys:settings:view", summary: "查询注册邀请列表" })
  async list() {
    this.assertAdmin();
    return this.ok(await this.service.listInvites());
  }

  @Post("/create", { description: "sys:settings:edit", summary: "生成注册邀请链接" })
  async create(@Body(ALL) body: { expiresDays?: number; remark?: string }) {
    this.assertAdmin();
    const res = await this.service.create({
      createdBy: this.getUserId(),
      expiresDays: body?.expiresDays,
      remark: body?.remark,
    });
    await this.auditLog({ content: `生成注册邀请链接(ID:${res.id})，有效期${res.expiresDays}天` });
    return this.ok(res);
  }

  @Post("/disable", { description: "sys:settings:edit", summary: "禁用注册邀请链接" })
  async disable(@Body(ALL) body: { id: number }) {
    this.assertAdmin();
    const ok = await this.service.disable(Number(body?.id));
    if (!ok) {
      throw new Error("邀请链接不存在、已使用或已禁用，无法禁用");
    }
    await this.auditLog({ content: `禁用注册邀请链接(ID:${body.id})` });
    return this.ok({});
  }

  @Post("/updateRemark", { description: "sys:settings:edit", summary: "更新注册邀请备注" })
  async updateRemark(@Body(ALL) body: { id: number; remark?: string }) {
    this.assertAdmin();
    const ok = await this.service.updateRemark({ id: Number(body?.id), remark: body?.remark });
    if (!ok) {
      throw new Error("邀请链接不存在");
    }
    await this.auditLog({ content: `更新注册邀请备注(ID:${body.id})` });
    return this.ok({});
  }
}
