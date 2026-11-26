-- 注册邀请：一次性邀请链接（仅存token哈希，明文仅创建时返回）
CREATE TABLE `cd_register_invite`
(
  `id`             bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `token_hash`     varchar(64)  NOT NULL,
  `created_by`     bigint       NOT NULL,
  `expires_time`   bigint       NOT NULL,
  `used_time`      bigint,
  `used_user_id`   bigint,
  `used_user_name` varchar(100),
  `disabled`       boolean      NOT NULL DEFAULT 0,
  `disabled_time`  bigint,
  `remark`         varchar(255),
  `create_time`    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;
CREATE UNIQUE INDEX `index_register_invite_token` ON `cd_register_invite` (`token_hash`);
CREATE INDEX `index_register_invite_expires` ON `cd_register_invite` (`expires_time`);
