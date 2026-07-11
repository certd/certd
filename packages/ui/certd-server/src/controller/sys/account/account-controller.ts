import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { BaseController, PlusService, SysInstallInfo, SysSettingsService } from "@certd/lib-server";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

export type PreBindUserReq = {
  userId: number;
};
export type BindUserReq = {
  userId: number;
};
/**
 */
@Provide()
@Controller("/api/sys/account")
export class BasicController extends BaseController {
  @Inject()
  plusService: PlusService;

  @Inject()
  sysSettingsService: SysSettingsService;

  getAuditType(): string {
    return AuditType.account;
  }

  @Post("/preBindUser", { description: "sys:settings:edit", summary: "预绑定用户" })
  public async preBindUser(@Body(ALL) body: PreBindUserReq) {
    if (body.userId == null || body.userId <= 0) {
      throw new Error("用户ID不能为空");
    }
    await this.plusService.userPreBind(body.userId);
    await this.auditLog({ content: `预绑定了用户(ID:${body.userId})` });
    return this.ok({});
  }

  @Post("/bindUser", { description: "sys:settings:edit", summary: "绑定用户" })
  public async bindUser(@Body(ALL) body: BindUserReq) {
    if (body.userId == null || body.userId <= 0) {
      throw new Error("用户ID不能为空");
    }
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    installInfo.bindUserId = body.userId;
    await this.sysSettingsService.saveSetting(installInfo);
    await this.auditLog({ content: `绑定了用户(ID:${body.userId})` });
    return this.ok({});
  }

  @Post("/unbindUser", { description: "sys:settings:edit", summary: "解绑用户" })
  public async unbindUser() {
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    installInfo.bindUserId = null;
    await this.sysSettingsService.saveSetting(installInfo);
    await this.auditLog({ content: "解绑了用户" });
    return this.ok({});
  }

  @Post("/updateLicense", { description: "sys:settings:edit", summary: "更新许可证" })
  public async updateLicense(@Body(ALL) body: { license: string }) {
    await this.plusService.updateLicense(body.license);
    await this.auditLog({ content: "更新了许可证" });
    return this.ok(true);
  }
}
