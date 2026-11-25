-- CA级本地直签开关：默认关闭；关闭时仅允许经本地ACME（EAB权限决定直签）签发
ALTER TABLE `cd_local_ca` ADD COLUMN `allow_direct_sign` boolean NOT NULL DEFAULT 0;
