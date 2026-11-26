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
      // 防御性归一化（大小写+重复斜杠）：即使路由层对路径变体大小写不敏感或规范化，门禁仍能识别并拦截，
      // 避免出现"Controller可处理但门禁未执行"的绕过。归一化仅用于门禁匹配，不影响后续路由使用原始ctx.path。
      const normalizedPath = decodedPath.toLowerCase().replace(/\/{2,}/g, "/");
      const match = normalizedPath.match(/^\/api\/acme\/(\d+)(\/|$)/);
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
      // 吊销端点保留历史证书吊销能力：签发服务关闭/CA禁用后仍允许（账户认证与网络门禁不变）
      const isRevoke = /\/revoke-cert\/?$/.test(normalizedPath);
      try {
        await service.assertAccess(ctx, caId, { revoke: isRevoke });
        // 未认证引导端点额外按来源IP限速，防止nonce耗尽与账户批量注册滥用
        if (/\/(directory|new-nonce|new-account)\/?$/.test(normalizedPath)) {
          await service.assertBootstrapRateLimit(ctx, caId);
        }
      } catch (e: any) {
        const problem = e instanceof AcmeProblem ? e : new AcmeProblem("serverInternal", e?.message || "ACME访问校验失败", 500);
        service.respondError(ctx, problem);
        return;
      }
      await next();
    };
  }
}
