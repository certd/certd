import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { IMidwayKoaContext, IWebMiddleware, NextFunction } from "@midwayjs/koa";
import { AcmeServerService } from "../modules/acme-server/service/acme-server-service.js";
import { AcmeProblem } from "../modules/acme-server/protocol/acme-jws.js";

/**
 * ACME端点访问门禁：统一拦截 /api/acme/:caId/* （含directory/new-nonce）。
 * 校验总开关、来源IP/CIDR白名单、HTTP Basic认证、自定义头白名单。
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class AcmeAccessMiddleware implements IWebMiddleware {
  resolve() {
    return async (ctx: IMidwayKoaContext, next: NextFunction) => {
      // 解码路径，避免 %31 等编码绕过；与路由 :caId 解析保持一致
      let decodedPath = ctx.path;
      try {
        decodedPath = decodeURIComponent(ctx.path);
      } catch {
        decodedPath = ctx.path;
      }
      const match = decodedPath.match(/^\/api\/acme\/(\d+)(\/|$)/);
      if (!match) {
        await next();
        return;
      }
      const service = await ctx.requestContext.getAsync(AcmeServerService);
      const segment = match[1];
      // 拒绝非规范数字段（如 01），防止与路由 Number(caId) 解析不一致而跳过门禁
      if (String(Number(segment)) !== segment) {
        service.respondError(ctx, new AcmeProblem("malformed", "非法的CA标识", 400));
        return;
      }
      const caId = Number(segment);
      try {
        await service.assertAccess(ctx, caId);
      } catch (e: any) {
        const problem = e instanceof AcmeProblem ? e : new AcmeProblem("serverInternal", e?.message || "ACME访问校验失败", 500);
        service.respondError(ctx, problem);
        return;
      }
      await next();
    };
  }
}