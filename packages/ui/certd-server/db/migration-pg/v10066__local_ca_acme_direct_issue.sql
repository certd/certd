-- EAB直签：开启后，已通过EAB认证的ACME账户签发订单时跳过HTTP-01/DNS-01域名校验；默认关闭
ALTER TABLE cd_local_ca ADD COLUMN acme_direct_issue boolean NOT NULL DEFAULT (false);
