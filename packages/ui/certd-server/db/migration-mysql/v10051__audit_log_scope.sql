ALTER TABLE `cd_audit_log` ADD COLUMN `scope` varchar(32) NOT NULL DEFAULT 'user';
CREATE INDEX `index_audit_log_scope` ON `cd_audit_log` (`scope`);
