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
      const match = ctx.path.match(/^\/api\/acme\/([1-9]\d*)(\/|$)/);
      if (!match) {
        await next();
        return;
      }
      const caId = Number(match[1]);
      const service = await ctx.requestContext.getAsync(AcmeServerService);
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