
-- 证书仓库记录增加状态字段：active=激活，inactive=未激活，revoked=已吊销
ALTER TABLE cd_cert_info ADD COLUMN status varchar(20) NOT NULL DEFAULT 'active';
-- 吊销时间
ALTER TABLE cd_cert_info ADD COLUMN revoke_time bigint NULL;
-- 证书申请任务id：用于吊销旧证书时按任务id精确匹配（只吊销同一申请任务产出的旧证书）
ALTER TABLE cd_cert_info ADD COLUMN task_id varchar(100) NULL;
