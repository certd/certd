import { Inject, Provide } from "@midwayjs/core";
import { IMidwayKoaContext, IWebMiddleware, NextFunction } from "@midwayjs/koa";
import { Constants } from "@certd/lib-server";
import { AuditService } from "../modules/sys/enterprise/service/audit-service.js";
import { isPlus } from "@certd/plus-core";

@Provide()
export class AuditLogMiddleware implements IWebMiddleware {
  @Inject()
  auditService: AuditService;

  resolve() {
    return async (ctx: IMidwayKoaContext, next: NextFunction) => {
      try {
        await next();
        await this.writeAuditLog(ctx);
      } catch (err) {
        await this.writeAuditLog(ctx, err);
        throw err;
      }
    };
  }

  private async writeAuditLog(ctx: IMidwayKoaContext, err?: any) {
    const routeInfo = ctx.auditRouteInfo;
    if (!routeInfo) {
      return;
    }
    const auditLog = ctx.auditLog;
    if (!auditLog?.enabled) {
      return;
    }
    if (!isPlus()) {
      return;
    }
    let isSuccess = this.isSuccessResponse(ctx);

    if (err) {
      isSuccess = false;
      if (err?.userId != null && auditLog?.userId == null) {
        auditLog.userId = err.userId;
      }
    }

    const type = auditLog.type || (await this.resolveControllerType(routeInfo.controllerClz, ctx as any));
    const action = auditLog.action || routeInfo.summary || "";
    const append = auditLog.append;
    const appendList = Array.isArray(append) ? append : append ? [append] : [];
    const content = auditLog.content || appendList.filter(item => item && String(item).trim()).join(" ") || action;

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
      success: isSuccess,
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
