
CREATE TABLE `sys_passkey`
(
  `id`          bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`     bigint      NOT NULL,
  `device_name` varchar(100) NOT NULL,
  `passkey_id`  varchar(100) NOT NULL,
  `public_key`  varchar(1024) NOT NULL,
  `counter`     bigint      NOT NULL,
  `transports`  varchar(512) NULL,
  `registered_at` bigint      NOT NULL,
  `create_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX `index_passkey_user_id` ON `sys_passkey` (`user_id`);
CREATE INDEX `index_passkey_passkey_id` ON `sys_passkey` (`passkey_id`);

ALTER TABLE `sys_passkey` ENGINE = InnoDB;