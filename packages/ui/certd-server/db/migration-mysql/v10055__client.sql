
-- 客户端登记表：certd-client 心跳上报后记录在线状态；客户端自身信息保留独立列，站点统计等快照存 content JSON，后续扩展直接往 JSON 加字段。
CREATE TABLE `cd_client`
(
  `id`                bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`           bigint NOT NULL,
  `project_id`        bigint,
  `client_id`         varchar(64) NOT NULL,
  `key_id`            varchar(64),
  `machine_name`      varchar(255),
  `version`           varchar(64),
  `os`                varchar(64),
  `content`           longtext,
  `last_heartbeat_at` bigint NOT NULL,
  `create_time`       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;

CREATE INDEX `index_client_user_id` ON `cd_client` (`user_id`);
CREATE INDEX `index_client_project_id` ON `cd_client` (`project_id`);
CREATE UNIQUE INDEX `index_client_user_client` ON `cd_client` (`user_id`, `client_id`);

-- 开放接口密钥用途备注
ALTER TABLE cd_open_key ADD COLUMN `remark` varchar(512);
