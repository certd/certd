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
}
