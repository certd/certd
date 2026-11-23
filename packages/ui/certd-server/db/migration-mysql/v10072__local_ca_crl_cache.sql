-- 缓存最近一次成功生成的 CRL，供 Root/离线/密钥不可用场景只读提供
ALTER TABLE cd_local_ca ADD COLUMN last_crl_pem longtext;
ALTER TABLE cd_local_ca ADD COLUMN last_crl_time bigint;
