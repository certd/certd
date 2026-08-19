ALTER TABLE "cd_audit_log" ADD COLUMN "scope" varchar(32) NOT NULL DEFAULT ('user');
CREATE INDEX "index_audit_log_scope" ON "cd_audit_log" ("scope");

ALTER TABLE "cd_audit_log" ADD COLUMN "success" boolean NOT NULL DEFAULT true;

-- 审计日志表索引
CREATE INDEX "index_audit_log_type" ON "cd_audit_log" ("type");
CREATE INDEX "index_audit_log_create_time" ON "cd_audit_log" ("create_time");