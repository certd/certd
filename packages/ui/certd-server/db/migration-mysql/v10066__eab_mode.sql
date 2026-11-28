-- EAB用途：local=管理员分配给用户/项目；standard=外部客户端交付
ALTER TABLE `cd_acme_eab` ADD COLUMN `mode` varchar(20) NOT NULL DEFAULT 'standard';
