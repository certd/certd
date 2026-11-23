-- CRL Number：数据库持久化单调递增，避免秒级时间戳重复/回拨
ALTER TABLE cd_local_ca ADD COLUMN crl_number integer NOT NULL DEFAULT 0;
