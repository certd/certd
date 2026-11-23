-- CA 级访问基址：用于生成 CRL/ACME 等外部地址；为空时使用站点 bindUrl
ALTER TABLE cd_local_ca ADD COLUMN base_url varchar(500);
