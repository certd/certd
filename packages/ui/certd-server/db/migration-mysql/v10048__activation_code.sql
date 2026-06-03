-- 激活码表
CREATE TABLE `cd_product_activation_code`
(
    `id`            bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
    `code`          varchar(50)  NOT NULL,
    `product_id`    bigint      NOT NULL,
    `duration`      bigint      NOT NULL,
    `batch_no`      varchar(50)  NOT NULL DEFAULT '',
    `status`        varchar(20)  NOT NULL DEFAULT 'unused',
    `used_user_id`  bigint,
    `used_time`     bigint,
    `expire_time`   bigint,
    `disabled_time` bigint,
    `exported`      bigint      NOT NULL DEFAULT 0,
    `export_time`   bigint,
    `remark`        varchar(500) NOT NULL DEFAULT '',
    `create_time`   timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time`   timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;

CREATE UNIQUE INDEX `index_activation_code_code` ON `cd_product_activation_code` (`code`);
CREATE INDEX `index_activation_code_batch_no` ON `cd_product_activation_code` (`batch_no`);
CREATE INDEX `index_activation_code_status` ON `cd_product_activation_code` (`status`);
CREATE INDEX `index_activation_code_expire_time` ON `cd_product_activation_code` (`expire_time`);
CREATE INDEX `index_activation_code_exported` ON `cd_product_activation_code` (`exported`);

-- cd_user_suite 增加激活码来源追溯
ALTER TABLE `cd_user_suite`
    ADD COLUMN `activation_code_id` bigint;
