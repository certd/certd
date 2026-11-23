-- Root CA 默认禁止在线解密私钥；显式开启后才允许签中间CA/导出
ALTER TABLE cd_local_ca ADD COLUMN root_key_online_enabled boolean NOT NULL DEFAULT 0;
