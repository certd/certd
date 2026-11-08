CREATE TABLE `cd_risk_record`
(
  `id`             bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `risk_type`      varchar(64) NOT NULL,
  `risk_level`     varchar(16) NOT NULL,
  `ip`             varchar(64) NOT NULL,
  `path`           longtext,
  `user_id`        bigint,
  `pipeline_id`    bigint,
  `pipeline_name`  varchar(255),
  `matched_pattern` longtext,
  `status`         varchar(32) NOT NULL,
  `detail`         longtext,
  `create_time`    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;

CREATE INDEX `index_risk_record_type` ON `cd_risk_record` (`risk_type`);
CREATE INDEX `index_risk_record_ip` ON `cd_risk_record` (`ip`);
CREATE INDEX `index_risk_record_create_time` ON `cd_risk_record` (`create_time`);
