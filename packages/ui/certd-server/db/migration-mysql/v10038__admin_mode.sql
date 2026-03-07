
CREATE TABLE `cd_project`
(
  `id`          bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`     bigint      NOT NULL,
  `name`        varchar(512) NOT NULL,
  `admin_id`    bigint      NOT NULL,
  `disabled`    boolean      NOT NULL DEFAULT false,
  `is_system`   boolean      NOT NULL DEFAULT false,
  `create_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX `index_project_user_id` ON `cd_project` (`user_id`);
CREATE INDEX `index_project_admin_id` ON `cd_project` (`admin_id`);
INSERT INTO cd_project (id, user_id, `admin_id`, `name`, `disabled`, `is_system`) VALUES (1, -1, 1,'default', false,false);

ALTER TABLE cd_cert_info ADD COLUMN  project_id bigint;
CREATE INDEX `index_cert_project_id` ON `cd_cert_info` (`project_id`);

ALTER TABLE cd_site_info ADD COLUMN  project_id bigint;
CREATE INDEX `index_site_project_id` ON `cd_site_info` (`project_id`);

ALTER TABLE cd_site_ip ADD COLUMN  project_id bigint;
CREATE INDEX `index_site_ip_project_id` ON `cd_site_ip` (`project_id`);

ALTER TABLE cd_open_key ADD COLUMN  project_id bigint;
CREATE INDEX `index_open_key_project_id` ON `cd_open_key` (`project_id`);

ALTER TABLE cd_access ADD COLUMN  project_id bigint;
CREATE INDEX `index_access_project_id` ON `cd_access` (`project_id`);

ALTER TABLE cd_addon ADD COLUMN  project_id bigint;
CREATE INDEX `index_addon_project_id` ON `cd_addon` (`project_id`);

ALTER TABLE pi_pipeline ADD COLUMN  project_id bigint;
CREATE INDEX `index_pipeline_project_id` ON `pi_pipeline` (`project_id`);

ALTER TABLE pi_pipeline_group ADD COLUMN  project_id bigint;
CREATE INDEX `index_pipeline_group_project_id` ON `pi_pipeline_group` (`project_id`);

ALTER TABLE pi_storage ADD COLUMN  project_id bigint;
CREATE INDEX `index_storage_project_id` ON `pi_storage` (`project_id`);

ALTER TABLE pi_notification ADD COLUMN  project_id bigint;
CREATE INDEX `index_notification_project_id` ON `pi_notification` (`project_id`);

ALTER TABLE pi_history ADD COLUMN  project_id bigint;
CREATE INDEX `index_history_project_id` ON `pi_history` (`project_id`);

ALTER TABLE pi_history_log ADD COLUMN  project_id bigint;
CREATE INDEX `index_history_log_project_id` ON `pi_history_log` (`project_id`);

ALTER TABLE pi_template ADD COLUMN  project_id bigint;
CREATE INDEX `index_template_project_id` ON `pi_template` (`project_id`);

ALTER TABLE pi_sub_domain ADD COLUMN  project_id bigint;
CREATE INDEX `index_sub_domain_project_id` ON `pi_sub_domain` (`project_id`);

ALTER TABLE cd_cname_record ADD COLUMN  project_id bigint;
CREATE INDEX `index_cname_record_project_id` ON `cd_cname_record` (`project_id`);

ALTER TABLE cd_domain ADD COLUMN  project_id bigint;
CREATE INDEX `index_domain_project_id` ON `cd_domain` (`project_id`);

ALTER TABLE user_settings ADD COLUMN  project_id bigint;
CREATE INDEX `index_user_settings_project_id` ON `user_settings` (`project_id`);

ALTER TABLE cd_group ADD COLUMN  project_id bigint;
CREATE INDEX `index_group_project_id` ON `cd_group` (`project_id`);




CREATE TABLE `cd_project_member`
(
  `id`          bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`     bigint      NOT NULL,
  `project_id`  bigint      NOT NULL,
  `permission`  varchar(128) NOT NULL DEFAULT 'read',
  `create_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE cd_project_member ADD COLUMN  status varchar(128);

CREATE INDEX `index_project_member_user_id` ON `cd_project_member` (`user_id`);
CREATE INDEX `index_project_member_project_id` ON `cd_project_member` (`project_id`);


CREATE TABLE `cd_audit_log`
(
  `id`          bigint PRIMARY KEY AUTO_INCREMENT NOT NULL,
  `user_id`     bigint      NOT NULL,
  `username`    varchar(128) NOT NULL,
  `project_id`  bigint      NOT NULL,
  `project_name` varchar(512) NOT NULL,
  `type`        varchar(128) NOT NULL,
  `action`      varchar(128) NOT NULL DEFAULT 'read',
  `content`     longtext         NOT NULL,
  `ip_address`  varchar(128) NOT NULL,
  `create_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX `index_audit_log_user_id` ON `cd_audit_log` (`user_id`);
CREATE INDEX `index_audit_log_project_id` ON `cd_audit_log` (`project_id`);



ALTER TABLE cd_site_info ADD COLUMN ip_address varchar(128);


ALTER TABLE `cd_project` ENGINE = InnoDB;
ALTER TABLE `cd_project_member` ENGINE = InnoDB;
ALTER TABLE `cd_audit_log` ENGINE = InnoDB;