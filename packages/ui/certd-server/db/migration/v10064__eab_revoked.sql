-- EAB泄漏不可恢复禁用标记：revoked=1 的凭证禁止重新启用
ALTER TABLE cd_acme_eab ADD COLUMN revoked INTEGER NOT NULL DEFAULT 0;