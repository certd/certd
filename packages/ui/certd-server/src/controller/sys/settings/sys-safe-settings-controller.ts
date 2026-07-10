import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { BaseController, SysSafeSetting } from "@certd/lib-server";
import { cloneDeep } from "lodash-es";
import { SafeService } from "../../../modules/sys/settings/safe-service.js";
import { AuditType, AuditAction } from "../../modules/sys/enterprise/service/audit-constants.js";

/**
 */
@Provide()
@Controller("/api/sys/settings/safe")
export class SysSettingsController extends BaseController {
  @Inject()
  safeService: SafeService;

  @Post("/get", { description: "sys:settings:view" })
  async safeGet() {
    const res = await this.safeService.getSafeSetting();
    const clone: SysSafeSetting = cloneDeep(res);
    delete clone.hidden?.openPassword;
    return this.ok(clone);
  }

  @Post("/save", { description: "sys:settings:edit" })
  async safeSave(@Body(ALL) body: any) {
    await this.safeService.saveSafeSetting(body);
    await this.auditLog({
      type: AuditType.settings,
      action: AuditAction.update,
      content: "修改了安全设置",
    });
    return this.ok({});
  }

  /**
   * 立即隐藏
   */
  @Post("/hidden", { description: "sys:settings:edit" })
  async hiddenImmediate() {
    await this.safeService.hiddenImmediately();
    return this.ok({});
  }
}
