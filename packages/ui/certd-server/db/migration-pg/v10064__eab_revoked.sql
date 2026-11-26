-- EAB泄漏不可恢复禁用标记：revoked=true 的凭证禁止重新启用
ALTER TABLE "cd_acme_eab" ADD COLUMN "revoked" boolean NOT NULL DEFAULT (false);