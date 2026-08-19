import { AuditLogContext } from "@certd/lib-server";

declare module "koa" {
  interface Context {
    auditLog?: AuditLogContext;
    auditRouteInfo?: { controllerClz?: any; method?: any; summary?: string; description?: string };
    projectId?: number;
  }
}
