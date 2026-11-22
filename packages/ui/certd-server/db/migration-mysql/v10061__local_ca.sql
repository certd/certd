-- 本地CA（根CA）：私钥仅保存 EncryptService 密文
CREATE TABLE `cd_local_ca`
(
  `id`                    bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`               bigint      NOT NULL,
  `project_id`            bigint,
  `name`                  varchar(100) NOT NULL,
  `source`                varchar(20)  NOT NULL DEFAULT 'generated',
  `key_type`              varchar(20)  NOT NULL DEFAULT 'rsa2048',
  `key_size`              bigint      NOT NULL DEFAULT 2048,
  `curve`                 varchar(50),
  `hash_algorithm`        varchar(20)  NOT NULL DEFAULT 'SHA256',
  `subject`               longtext         NOT NULL,
  `subject_cn`            varchar(100) NOT NULL,
  `cert_pem`              longtext         NOT NULL,
  `private_key_encrypted` longtext         NOT NULL,
  `key_encrypt_version`   varchar(20)  NOT NULL DEFAULT '1',
  `private_key_hash`      varchar(64)  NOT NULL,
  `fingerprint_sha256`    varchar(64)  NOT NULL,
  `not_before`            bigint      NOT NULL,
  `not_after`             bigint      NOT NULL,
  `usage`                 varchar(20)  NOT NULL DEFAULT 'server',
  `allowed_domains`       longtext,
  `max_validity_days`     bigint      NOT NULL DEFAULT 0,
  `acme_enabled`          boolean      NOT NULL DEFAULT 0,
  `acme_config`           longtext,
  `path_length`           bigint,
  `disabled`              boolean      NOT NULL DEFAULT 0,
  `remark`                varchar(500) NOT NULL DEFAULT '',
  `create_time`           timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`           timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;

CREATE INDEX `index_local_ca_user_id` ON `cd_local_ca` (`user_id`);
CREATE INDEX `index_local_ca_project_id` ON `cd_local_ca` (`project_id`);
CREATE INDEX `index_local_ca_fingerprint` ON `cd_local_ca` (`fingerprint_sha256`);
CREATE INDEX `index_local_ca_subject_cn` ON `cd_local_ca` (`subject_cn`);

ALTER TABLE cd_cert_info ADD COLUMN local_ca_id bigint;
ALTER TABLE cd_cert_info ADD COLUMN serial_number varchar(100);
CREATE INDEX `index_cert_info_local_ca` ON `cd_cert_info` (`local_ca_id`);
