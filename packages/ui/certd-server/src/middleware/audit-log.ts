import { Inject, Provide } from "@midwayjs/core";
import { IMidwayKoaContext, IWebMiddleware, NextFunction } from "@midwayjs/koa";
import { Constants } from "@certd/lib-server";
import { AuditService } from "../modules/sys/enterprise/service/audit-service.js";

@Provide()
export class AuditLogMiddleware implements IWebMiddleware {
  @Inject()
  auditService: AuditService;

  private isPlusFn: (() => Promise<boolean>) | null = null;

  private async getIsPlus(): Promise<boolean> {
    if (!this.isPlusFn) {
      try {
        const mod = await import("@certd/plus-core");
        this.isPlusFn = async () => mod.isPlus();
      } catch {
        this.isPlusFn = async () => false;
      }
    }
    return this.isPlusFn();
  }

  resolve() {
    return async (ctx: IMidwayKoaContext, next: NextFunction) => {
      await next();
      await this.writeAuditLog(ctx);
    };
  }

  private async writeAuditLog(ctx: IMidwayKoaContext) {
    const routeInfo = ctx.auditRouteInfo;
    if (!routeInfo) {
      return;
    }
    if (!ctx.auditLog?.enabled) {
      return;
    }
    const isPlus = await this.getIsPlus();
    if (!isPlus) {
      return;
    }
    if (!this.isSuccessResponse(ctx)) {
      return;
    }

    const auditLog = ctx.auditLog;
    if (!auditLog.enabled) {
      return;
    }
    const type = auditLog.type || (await this.resolveControllerType(routeInfo.controllerClz, ctx as any));
    const action = auditLog.action || routeInfo.summary || "";
    const append = auditLog.append;
    const appendList = Array.isArray(append) ? append : append ? [append] : [];
    const content = auditLog.content || appendList.filter(item => item && String(item).trim()).join(" ");

    if (!content) {
      return;
    }

    const projectId = auditLog.projectId ?? ctx.projectId ?? 0;
    const scope = auditLog.scope || (ctx.path.startsWith("/api/sys/") ? "system" : "user");
    const ipAddress = ctx.ip || "";

    await this.auditService.log({
      userId: auditLog.userId ?? ctx.user?.id ?? 0,
      type: type || "unknown",
      action,
      content,
      username: auditLog.username || ctx.user?.username,
      projectId,
      ipAddress,
      scope,
    });
  }

  private async resolveControllerType(controllerClz: any, ctx: any): Promise<string | undefined> {
    if (!controllerClz || !ctx.requestContext) {
      return undefined;
    }
    try {
      const controller = await ctx.requestContext.getAsync(controllerClz);
      return controller?.getAuditType?.();
    } catch {
      return undefined;
    }
  }

  private isSuccessResponse(ctx: IMidwayKoaContext) {
    if (ctx.status >= 400) {
      return false;
    }
    const body = ctx.body as any;
    if (body?.code == null) {
      return true;
    }
    return body.code === Constants.res.success.code;
  }
}
