import { createRequestParamDecorator } from "@midwayjs/core";

export const AuditLog = (opts: { enabled?: boolean }) => {
  return createRequestParamDecorator(ctx => {
    if (!ctx.auditLog) {
      ctx.auditLog = {};
    }
    if (opts.enabled !== undefined) {
      ctx.auditLog.enabled = opts.enabled || true;
    }
    return ctx.auditLog;
  });
};
