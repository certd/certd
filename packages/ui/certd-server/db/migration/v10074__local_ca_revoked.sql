-- 中间CA被父CA吊销后不可逆，禁止重新启用
ALTER TABLE cd_local_ca ADD COLUMN revoked boolean NOT NULL DEFAULT (0);
