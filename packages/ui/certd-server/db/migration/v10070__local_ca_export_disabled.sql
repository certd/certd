-- CA 保密选项：生成/导入时禁止导出 CA 证书和私钥
ALTER TABLE cd_local_ca ADD COLUMN export_disabled boolean NOT NULL DEFAULT (0);
