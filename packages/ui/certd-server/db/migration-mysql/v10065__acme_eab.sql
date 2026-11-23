-- 本地 ACME 服务的 EAB 凭证：用于限制谁能注册内部 ACME 账号
CREATE TABLE `cd_acme_eab`
(
  `id`                 varchar(32)  PRIMARY KEY NOT NULL,
  `ca_id`              bigint      NOT NULL,
  `user_id`            bigint      NOT NULL,
  `project_id`         bigint,
  `name`               varchar(100) NOT NULL,
  `kid`                varchar(100) NOT NULL,
  `hmac_key_encrypted` longtext         NOT NULL,
  `hmac_key_hash`      varchar(64)  NOT NULL,
  `max_uses`           bigint      NOT NULL DEFAULT 1,
  `used_count`         bigint      NOT NULL DEFAULT 0,
  `allowed_domains`    longtext,
  `expires_time`       bigint,
  `disabled`           boolean      NOT NULL DEFAULT 0,
  `create_time`        timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`        timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;
CREATE UNIQUE INDEX `index_acme_eab_kid` ON `cd_acme_eab` (`kid`);
CREATE INDEX `index_acme_eab_ca` ON `cd_acme_eab` (`ca_id`);

ALTER TABLE cd_acme_account ADD COLUMN eab_id varchar(32);
CREATE INDEX `index_acme_account_eab` ON `cd_acme_account` (`eab_id`);
