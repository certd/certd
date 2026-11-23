-- CA 删除改为软删除归档，保留证书、吊销和ACME历史
ALTER TABLE cd_local_ca ADD COLUMN deleted boolean NOT NULL DEFAULT (0);
