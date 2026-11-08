import { Inject, Provide } from "@midwayjs/core";
import { IMidwayKoaContext, IWebMiddleware, NextFunction } from "@midwayjs/koa";
import { Constants } from "@certd/lib-server";
import { AuditService, getAuditIpKey, USER_IP_HISTORY_DAYS } from "../modules/sys/enterprise/service/audit-service.js";
import { isPlus } from "@certd/plus-core";
import { logger } from "@certd/basic";
import type { UserService } from "../modules/sys/authority/service/user-service.js";
import type { NotificationService } from "../modules/pipeline/service/notification-service.js";

const LOGIN_PATHS = new Set(["/api/login",
  "/api/loginBySms",
  "/api/loginByTwoFactor",
  "/api/loginByPasskey",
  "/api/oauth/token",
  "/api/oauth/autoRegister",
  "/api/pi/pipeline/save",
  "/api/pi/pipeline/trigger",
]);

@Provide()
export class AuditLogMiddleware implements IWebMiddleware {
  @Inject()
  auditService: AuditService;

  @Inject("userService")
  userService: UserService;

  @Inject("notificationService")
  notificationService: NotificationService;

  resolve() {
    return async (ctx: IMidwayKoaContext, next: NextFunction) => {
      try {
        await next();
        try {
          await this.checkUnusualLogin(ctx);
        } catch (error) {
          logger.error("非常用 IP 登录提醒检查失败", error);
        }
        await this.writeAuditLog(ctx);
      } catch (err) {
        await this.writeAuditLog(ctx, err);
        throw err;
      }
    };
  }

  private async checkUnusualLogin(ctx: IMidwayKoaContext) {
    if (!isPlus() || ctx.method !== "POST" || !LOGIN_PATHS.has(ctx.path)) {
      return;
    }

    const auditLog = ctx.auditLog;
    const userId = ctx.user?.id || auditLog?.userId;
    if (ctx.status >= 400 || !Number.isSafeInteger(userId) || userId <= 0) {
      return;
    }
    const ipAddress = ctx.ip || "";
    const ipKey = getAuditIpKey(ipAddress);
    if (!ipKey) {
      return;
    }

    const unusual = await this.auditService.isUnusualLoginIp({ userId, ipKey });
    if (!unusual) {
      return;
    }
    const user = await this.userService.findOne({ id: userId });
    if (!user) {
      return;
    }

    const url = await this.notificationService.getBindUrl("#/cert/audit");

    const content = `您的账号 ${user.username} 从非常用 IP 登录。\n登录 IP：${ipAddress}\n登录时间：${new Date().toLocaleString("zh-CN")}\n该 IP 未出现在您此前 ${USER_IP_HISTORY_DAYS} 天的成功审计记录中。如非本人操作，请及时修改密码并检查账号安全。`

    try {
      await this.auditService.log({
        userId,
        username: user.username,
        type: "login",
        action: "非常用 IP 登录警告",
        content: content,
        ipAddress,
        scope: "user",
        projectId: 0,
        success: true,
      });
    } catch (error) {
      logger.error("非常用 IP 登录警告记录失败", error);
    }

    try {
      await this.notificationService.send(
        {
          useDefault: true,
          useEmail: true,
          emailAddress: user.email,
          logger,
          body: {
            title: "非常用 IP 登录警告",
            content: content,
            url,
            notificationType: "unusual-login",
          },
        },
        userId
      );
    } catch (error) {
      logger.error("非常用 IP 登录警告发送失败", error);
    }

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
    // 匿名请求不记录操作日志
    if (!ctx.user?.id && auditLog?.userId == null) {
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
