-- 本地CA最终结构：管理员维护、管理员ACL、用户授权、内置ACME和吊销记录
CREATE TABLE `cd_local_ca`
(
  `id`                    bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `name`                  varchar(100) NOT NULL,
  `source`                varchar(20)  NOT NULL DEFAULT 'generated',
  `ca_type`               varchar(20)  NOT NULL DEFAULT 'root',
  `parent_id`             bigint,
  `rotated_to_id`         bigint,
  `dns_server`              varchar(255),
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
  `allow_direct_sign`     boolean      NOT NULL DEFAULT 0,
  `acme_config`           longtext,
  `crl_number`            bigint      NOT NULL DEFAULT 0,
  `export_disabled`       boolean      NOT NULL DEFAULT 0,
  `last_crl_pem`          longtext,
  `last_crl_time`         bigint,
  `deleted`               boolean      NOT NULL DEFAULT 0,
  `revoked`               boolean      NOT NULL DEFAULT 0,
  `base_url`              varchar(500),
  `base_url_locked`       boolean      NOT NULL DEFAULT 0,
  `path_length`           bigint,
  `disabled`              boolean      NOT NULL DEFAULT 0,
  `remark`                varchar(500) NOT NULL DEFAULT '',
  `create_time`           timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`           timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;

CREATE INDEX `index_local_ca_fingerprint` ON `cd_local_ca` (`fingerprint_sha256`);
CREATE INDEX `index_local_ca_subject_cn` ON `cd_local_ca` (`subject_cn`);
CREATE INDEX `index_local_ca_parent_id` ON `cd_local_ca` (`parent_id`);

-- 管理员访问控制：owner可执行私钥相关敏感操作，operator可协助日常管理
CREATE TABLE `cd_local_ca_admin`
(
  `id`            bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `ca_id`         bigint      NOT NULL,
  `admin_user_id` bigint      NOT NULL,
  `role`          varchar(20)  NOT NULL DEFAULT 'owner',
  `create_time`   timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`   timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;
CREATE UNIQUE INDEX `index_local_ca_admin_unique` ON `cd_local_ca_admin` (`ca_id`, `admin_user_id`);
CREATE INDEX `index_local_ca_admin_user` ON `cd_local_ca_admin` (`admin_user_id`);

-- 中间CA授权：project_id=0 表示该用户全部项目可用
CREATE TABLE `cd_local_ca_grant`
(
  `id`                 bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `ca_id`              bigint     NOT NULL,
  `user_id`            bigint     NOT NULL,
  `project_id`         bigint      NOT NULL DEFAULT 0,
  `created_by_admin_id` bigint    NOT NULL,
  `disabled`           boolean     NOT NULL DEFAULT 0,
  `create_time`        timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`        timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;
CREATE UNIQUE INDEX `index_local_ca_grant_unique` ON `cd_local_ca_grant` (`ca_id`, `user_id`, `project_id`);
CREATE INDEX `index_local_ca_grant_user` ON `cd_local_ca_grant` (`user_id`, `project_id`);
CREATE INDEX `index_local_ca_grant_ca` ON `cd_local_ca_grant` (`ca_id`);

CREATE TABLE `cd_acme_account`
(
  `id`          varchar(32)  PRIMARY KEY NOT NULL,
  `ca_id`       bigint      NOT NULL,
  `user_id`     bigint      NOT NULL DEFAULT 0,
  `project_id`  bigint,
  `jwk`         longtext         NOT NULL,
  `thumbprint`  varchar(64)  NOT NULL,
  `eab_id`      varchar(32),
  `status`      varchar(20)  NOT NULL DEFAULT 'valid',
  `contact`     longtext,
  `create_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;
CREATE UNIQUE INDEX `index_acme_account_ca_thumbprint` ON `cd_acme_account` (`ca_id`, `thumbprint`);
CREATE INDEX `index_acme_account_eab` ON `cd_acme_account` (`eab_id`);

CREATE TABLE `cd_acme_order`
(
  `id`             varchar(32) PRIMARY KEY NOT NULL,
  `ca_id`          bigint     NOT NULL,
  `account_id`     varchar(32) NOT NULL,
  `status`         varchar(20) NOT NULL DEFAULT 'pending',
  `identifiers`    longtext        NOT NULL,
  `authz_ids`      longtext        NOT NULL,
  `csr`            longtext,
  `cert_pem`       longtext,
  `serial_number`  varchar(100),
  `error`          longtext,
  `expires_time`   bigint      NOT NULL,
  `direct_issue`   boolean     NOT NULL DEFAULT 0,
  `create_time`    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;
CREATE INDEX `index_acme_order_account` ON `cd_acme_order` (`account_id`);
CREATE INDEX `index_acme_order_ca` ON `cd_acme_order` (`ca_id`);
CREATE INDEX `index_acme_order_serial` ON `cd_acme_order` (`serial_number`);

CREATE TABLE `cd_acme_authz`
(
  `id`               varchar(32) PRIMARY KEY NOT NULL,
  `ca_id`            bigint     NOT NULL,
  `order_id`         varchar(32) NOT NULL,
  `account_id`       varchar(32) NOT NULL,
  `identifier_type`  varchar(20) NOT NULL DEFAULT 'dns',
  `identifier_value` varchar(255) NOT NULL,
  `wildcard`         boolean     NOT NULL DEFAULT 0,
  `status`           varchar(20) NOT NULL DEFAULT 'pending',
  `expires_time`     bigint      NOT NULL,
  `create_time`      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;
CREATE INDEX `index_acme_authz_order` ON `cd_acme_authz` (`order_id`);

CREATE TABLE `cd_acme_challenge`
(
  `id`                varchar(32)  PRIMARY KEY NOT NULL,
  `ca_id`             bigint      NOT NULL,
  `order_id`          varchar(32)  NOT NULL,
  `authz_id`          varchar(32)  NOT NULL,
  `account_id`        varchar(32)  NOT NULL,
  `type`              varchar(20)  NOT NULL,
  `token`             varchar(255) NOT NULL,
  `key_authorization` varchar(255) NOT NULL,
  `status`            varchar(20)  NOT NULL DEFAULT 'pending',
  `error`             longtext,
  `validated_time`    bigint,
  `create_time`       timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`       timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;
CREATE INDEX `index_acme_challenge_authz` ON `cd_acme_challenge` (`authz_id`);
CREATE INDEX `index_acme_challenge_order` ON `cd_acme_challenge` (`order_id`);

CREATE TABLE `cd_acme_eab`
(
  `id`                 varchar(32)  PRIMARY KEY NOT NULL,
  `ca_id`              bigint      NOT NULL,
  `grant_id`           bigint,
  `user_id`            bigint      NOT NULL DEFAULT 0,
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
  `privileged`         boolean      NOT NULL DEFAULT 0,
  `revoked`            boolean      NOT NULL DEFAULT 0,
  `remark`             varchar(255),
  `create_time`        timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`        timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;
CREATE UNIQUE INDEX `index_acme_eab_kid` ON `cd_acme_eab` (`kid`);
CREATE INDEX `index_acme_eab_ca` ON `cd_acme_eab` (`ca_id`);
CREATE INDEX `index_acme_eab_grant` ON `cd_acme_eab` (`grant_id`);

CREATE TABLE `cd_cert_revocation`
(
  `id`            bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `ca_id`         bigint      NOT NULL,
  `user_id`       bigint      NOT NULL,
  `project_id`    bigint,
  `cert_info_id`  bigint,
  `serial_number` varchar(100) NOT NULL,
  `revoked_time`  bigint      NOT NULL,
  `reason`        varchar(50)  NOT NULL DEFAULT 'unspecified',
  `expires_time`  bigint,
  `cert_pem`      text,
  `create_time`   timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;
CREATE UNIQUE INDEX `index_cert_revocation_ca_serial` ON `cd_cert_revocation` (`ca_id`, `serial_number`);
CREATE INDEX `index_cert_revocation_ca_id` ON `cd_cert_revocation` (`ca_id`);

ALTER TABLE cd_cert_info ADD COLUMN local_ca_id bigint;
ALTER TABLE cd_cert_info ADD COLUMN serial_number varchar(100);
CREATE INDEX `index_cert_info_local_ca` ON `cd_cert_info` (`local_ca_id`);

INSERT INTO cd_cert_revocation (ca_id, user_id, project_id, cert_info_id, serial_number, revoked_time, reason, expires_time)
SELECT local_ca_id,
       MIN(user_id),
       MIN(project_id),
       MIN(id),
       UPPER(serial_number),
       MAX(COALESCE(revoke_time, 0)),
       'unspecified',
       MAX(expires_time)
FROM cd_cert_info
WHERE local_ca_id IS NOT NULL
  AND serial_number IS NOT NULL
  AND serial_number <> ''
  AND status = 'revoked'
GROUP BY local_ca_id, UPPER(serial_number);
