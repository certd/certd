ALTER TABLE cd_access ADD COLUMN subtype varchar(100);
CREATE INDEX `index_access_subtype` ON `cd_access` (`subtype`);

CREATE TABLE `cd_dns_persist_record`
(
  `id`                     bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`                bigint      NOT NULL,
  `project_id`             bigint,
  `domain`                 varchar(255) NOT NULL,
  `main_domain`            varchar(255) NOT NULL,
  `ca_type`                varchar(50)  NOT NULL,
  `acme_account_access_id` bigint      NOT NULL,
  `account_uri`            varchar(512) NOT NULL,
  `host_record`            varchar(255) NOT NULL,
  `record_value`           longtext         NOT NULL,
  `policy`                 varchar(50),
  `persist_until`          bigint,
  `status`                 varchar(50)  NOT NULL DEFAULT 'pending',
  `dns_provider_type`      varchar(50),
  `dns_provider_access`    bigint,
  `record_res`             longtext,
  `disabled`               bigint      NOT NULL DEFAULT 0,
  `create_time`            timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`            timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;

CREATE INDEX `index_dns_persist_user_id` ON `cd_dns_persist_record` (`user_id`);
CREATE INDEX `index_dns_persist_project_id` ON `cd_dns_persist_record` (`project_id`);
CREATE INDEX `index_dns_persist_domain` ON `cd_dns_persist_record` (`domain`(191));
CREATE INDEX `index_dns_persist_main_domain` ON `cd_dns_persist_record` (`main_domain`(191));
CREATE INDEX `index_dns_persist_account` ON `cd_dns_persist_record` (`acme_account_access_id`);
