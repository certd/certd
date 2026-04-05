
CREATE TABLE `cd_job_history`
(
  `id`          bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`     bigint      NOT NULL,
  `project_id`  bigint      ,
  `type`        varchar(100) NOT NULL,
  `title`       varchar(512) NOT NULL,
  `related_id`  varchar(100),
  `result`      varchar(100) NOT NULL,
  `content`     longtext         ,
  `start_at`    bigint      NOT NULL,
  `end_at`      bigint      ,
  `create_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
);



CREATE INDEX `index_job_history_user_id` ON `cd_job_history` (`user_id`);
CREATE INDEX `index_job_history_project_id` ON `cd_job_history` (`project_id`);
CREATE INDEX `index_job_history_type` ON `cd_job_history` (`type`);

ALTER TABLE `cd_job_history` ENGINE = InnoDB;