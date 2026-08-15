
-- 证书仓库记录增加状态字段：active=激活，inactive=未激活，revoked=已吊销
ALTER TABLE cd_cert_info ADD COLUMN status varchar(20) NOT NULL DEFAULT 'active';
-- 吊销时间
ALTER TABLE cd_cert_info ADD COLUMN revoke_time bigint NULL;
