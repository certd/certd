
ALTER TABLE `sys_passkey` ADD COLUMN `rp_id` varchar(256) NULL;

DROP INDEX `index_passkey_passkey_id` ON `sys_passkey`;

ALTER TABLE `sys_passkey` ADD UNIQUE INDEX `index_passkey_passkey_id` (`passkey_id`);
