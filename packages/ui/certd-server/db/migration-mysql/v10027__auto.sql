DROP TABLE IF EXISTS `cd_domain`;
CREATE TABLE `cd_domain`
(
  `id`          bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`     bigint,
  `domain` varchar(512),
  challenge_type varchar(50),
  dns_provider_type varchar(50),
  dns_provider_access bigint,
  http_uploader_type varchar(50),
  http_uploader_access bigint,
  http_upload_root_dir varchar(512),
  `disabled`    boolean  NOT NULL DEFAULT false,
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `index_domain_user_id` ON `cd_domain` (`user_id`);
CREATE INDEX `index_domain_domain` ON `cd_domain` (`domain`(100));

