CREATE TABLE `cd_product`
(
  `id`              bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `icon`            varchar(100),
  `title`           varchar(100),
  `type`            varchar(100),
  `content`         varchar(4096),
  `duration_prices` varchar(4096),
  `duration`        bigint,
  `price`           bigint,
  `intro`           varchar(4096),
  `order`           bigint,
  `support_buy`     boolean,
  `disabled`        boolean  NOT NULL DEFAULT false,
  `create_time`     timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`     timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `cd_trade`
(
  `id`          bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `trade_no`    varchar(100),
  `user_id`     bigint,
  `product_id`  bigint,
  `title`       varchar(1024),
  `desc`        varchar(2048),
  `num`         bigint,
  `duration`    bigint,
  `price`       bigint,
  `amount`      bigint,
  `remark`      varchar(2048),
  `status`      varchar(100),
  `pay_type`    varchar(50),
  `pay_time`    bigint,
  `pay_no`      varchar(100),
  `end_time`    bigint,
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `index_trade_user_id` ON `cd_trade` (`user_id`);
CREATE UNIQUE INDEX `index_trade_trade_no` ON `cd_trade` (`trade_no`);
CREATE INDEX `index_trade_pay_no` ON `cd_trade` (`pay_type`, `pay_no`);


CREATE TABLE `cd_user_suite`
(
  `id`                bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`           bigint,
  `product_id`        bigint,
  `trade_id`          bigint,
  `icon`              varchar(100),
  `title`             varchar(100),
  `content`           text,
  `duration`          bigint,
  `product_type`      varchar(50),
  `deploy_count_used` bigint,
  `is_present`        boolean,
  `is_bootstrap`      boolean,
  `is_empty`          boolean,
  `disabled`          boolean  NOT NULL DEFAULT false,
  `active_time`       bigint,
  `expires_time`      bigint,
  `create_time`       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `index_user_suite_user_id` ON `cd_user_suite` (`user_id`);


DROP TABLE IF EXISTS `cd_cert`;
DROP TABLE IF EXISTS `cd_cert_apply_history`;
DROP TABLE IF EXISTS `cd_cert_issuer`;
DROP TABLE IF EXISTS `cd_task`;
DROP TABLE IF EXISTS `cd_task_history`;



CREATE TABLE `cd_cert_info`
(
  `id`            bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`       bigint,
  `domain`        varchar(100),
  `domains`       varchar(4096),
  `domain_count`  bigint,
  `pipeline_id`   bigint,
  `apply_time`    bigint,
  `from_type`     varchar(100),
  `cert_provider` varchar(100),
  `expires_time`  bigint,
  `cert_info`     text,
  `cert_file`     varchar(100),
  `disabled`      boolean  NOT NULL DEFAULT false,
  `create_time`   timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`   timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `index_cert_info_user_id` ON `cd_cert_info` (`user_id`);
CREATE INDEX `index_cert_info_domain` ON `cd_cert_info` (`domain`);
CREATE INDEX `index_cert_info_domains` ON `cd_cert_info` (`domains`(190));
CREATE INDEX `index_cert_info_pipeline` ON `cd_cert_info` (`pipeline_id`);


CREATE TABLE `cd_site_info`
(
  `id`                bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`           bigint,

  `name`              varchar(100),
  `domain`            varchar(100),

  `https_port`        bigint,
  `cert_domains`      varchar(4096),
  `cert_info`         varchar(4096),
  `cert_provider`     varchar(100),
  `cert_status`       varchar(100),
  `cert_expires_time` bigint,
  `last_check_time`   bigint,
  `check_status`      varchar(100),
  `error`             varchar(4096),
  `pipeline_id`       bigint,
  `cert_info_id`      bigint,
  `disabled`          boolean  NOT NULL DEFAULT false,

  `create_time`       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX `index_site_info_user_id` ON `cd_site_info` (`user_id`);
CREATE INDEX `index_site_info_domain` ON `cd_site_info` (`domain`);
CREATE INDEX `index_site_info_pipeline` ON `cd_site_info` (`pipeline_id`);


ALTER TABLE pi_pipeline
  ADD COLUMN `type` varchar(50);
ALTER TABLE pi_pipeline
  ADD COLUMN `from` varchar(50);
