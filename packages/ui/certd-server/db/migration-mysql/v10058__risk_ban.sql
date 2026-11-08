CREATE TABLE `cd_risk_ban`
(
  `id`           bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `target_type`  varchar(16) NOT NULL,
  `target_value` varchar(128) NOT NULL,
  `action`       varchar(16) NOT NULL,
  `scope`        varchar(16) NOT NULL,
  `reason`       longtext,
  `expires_at`   timestamp,
  `enabled`      boolean NOT NULL DEFAULT 1,
  `create_time`  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB ROW_FORMAT = DYNAMIC;

CREATE INDEX `index_risk_ban_target` ON `cd_risk_ban` (`target_type`, `target_value`);
CREATE INDEX `index_risk_ban_action_scope` ON `cd_risk_ban` (`action`, `scope`, `enabled`);
