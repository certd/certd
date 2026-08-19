import { createRequestParamDecorator } from "@midwayjs/core";

export const AuditLog = (opts: { type?: string; action?: string; content?: string; enabled?: boolean } = {}) => {
  return createRequestParamDecorator(ctx => {
    if (!ctx.auditLog) {
      ctx.auditLog = {};
    }
    ctx.auditLog.enabled = opts.enabled !== false;
    if (opts.type != null) {
      ctx.auditLog.type = opts.type;
    }
    if (opts.action != null) {
      ctx.auditLog.action = opts.action;
    }
    if (opts.content != null) {
      ctx.auditLog.content = opts.content;
    }
    return ctx.auditLog;
  });
};
