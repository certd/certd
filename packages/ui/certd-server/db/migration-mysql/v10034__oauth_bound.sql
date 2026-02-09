
CREATE TABLE IF NOT EXISTS `cd_oauth_bound`
(
  `id`          bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`     bigint      NOT NULL,
  `type`        varchar(512) NOT NULL,
  `open_id`     varchar(512) NOT NULL,
  `create_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


CREATE INDEX `index_oauth_bound_user_id` ON `cd_oauth_bound` (`user_id`);
CREATE INDEX `index_oauth_bound_open_id` ON `cd_oauth_bound` (`open_id`(190));
