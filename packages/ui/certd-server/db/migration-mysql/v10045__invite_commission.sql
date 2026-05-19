ALTER TABLE cd_trade ADD COLUMN rebate_amount bigint NOT NULL DEFAULT 0;
ALTER TABLE cd_trade ADD COLUMN third_party_pay_amount bigint NOT NULL DEFAULT 0;

CREATE TABLE `cd_invite_code`
(
  `id`          bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`     bigint,
  `code`        varchar(50),
  `disabled`    boolean  NOT NULL DEFAULT false,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX `index_invite_code_user_id` ON `cd_invite_code` (`user_id`);
CREATE UNIQUE INDEX `index_invite_code_code` ON `cd_invite_code` (`code`);

CREATE TABLE `cd_invite_relation`
(
  `id`              bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `inviter_user_id` bigint,
  `invitee_user_id` bigint,
  `invite_code`     varchar(50),
  `create_time`     datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`     datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `index_invite_relation_inviter` ON `cd_invite_relation` (`inviter_user_id`);
CREATE UNIQUE INDEX `index_invite_relation_invitee` ON `cd_invite_relation` (`invitee_user_id`);

CREATE TABLE `cd_user_wallet`
(
  `id`                      bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`                 bigint,
  `available_amount`        bigint NOT NULL DEFAULT 0,
  `frozen_amount`           bigint NOT NULL DEFAULT 0,
  `total_income_amount`     bigint NOT NULL DEFAULT 0,
  `total_consumed_amount`   bigint NOT NULL DEFAULT 0,
  `total_withdraw_amount`   bigint NOT NULL DEFAULT 0,
  `create_time`             datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`             datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX `index_user_wallet_user_id` ON `cd_user_wallet` (`user_id`);

CREATE TABLE `cd_invite_commission_log`
(
  `id`              bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`         bigint,
  `amount`          bigint,
  `trade_id`        bigint,
  `invitee_user_id` bigint,
  `consume_amount`  bigint NOT NULL DEFAULT 0,
  `remark`          varchar(2048),
  `create_time`     datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`     datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `index_invite_log_user_id` ON `cd_invite_commission_log` (`user_id`);

CREATE TABLE `cd_user_wallet_log`
(
  `id`              bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`         bigint,
  `type`            varchar(50),
  `amount`          bigint,
  `balance_after`   bigint,
  `trade_id`        bigint,
  `withdraw_id`     bigint,
  `remark`          varchar(2048),
  `create_time`     datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`     datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `index_user_wallet_log_user_id` ON `cd_user_wallet_log` (`user_id`);

CREATE TABLE `cd_user_wallet_withdraw`
(
  `id`             bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`        bigint,
  `amount`         bigint,
  `status`         varchar(50),
  `channel`        varchar(50),
  `real_name`      varchar(100),
  `account`        varchar(200),
  `bank_name`      varchar(200),
  `qr_code`        varchar(512),
  `audit_user_id`  bigint,
  `audit_remark`   varchar(2048),
  `audit_time`     bigint,
  `create_time`    datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`    datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX `index_user_wallet_withdraw_user_id` ON `cd_user_wallet_withdraw` (`user_id`);
CREATE INDEX `index_user_wallet_withdraw_status` ON `cd_user_wallet_withdraw` (`status`);
