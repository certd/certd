
CREATE TABLE "cd_project"
(
  "id"          integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id"     integer      NOT NULL,
  "name"        varchar(512) NOT NULL,
  "disabled"    boolean      NOT NULL DEFAULT (false),
  "create_time" datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time" datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);


CREATE INDEX "index_project_user_id" ON "cd_project" ("user_id");
INSERT INTO cd_project (id, user_id, "name", "disabled") VALUES (1, 0, 'default', false);


ALTER TABLE cd_cert_info ADD COLUMN  project_id integer;
CREATE INDEX "index_cert_project_id" ON "cd_cert_info" ("project_id");

ALTER TABLE cd_site_info ADD COLUMN  project_id integer;
CREATE INDEX "index_site_project_id" ON "cd_site_info" ("project_id");

ALTER TABLE cd_site_ip ADD COLUMN  project_id integer;
CREATE INDEX "index_site_ip_project_id" ON "cd_site_ip" ("project_id");

ALTER TABLE cd_open_key ADD COLUMN  project_id integer;
CREATE INDEX "index_open_key_project_id" ON "cd_open_key" ("project_id");

ALTER TABLE cd_access ADD COLUMN  project_id integer;
CREATE INDEX "index_access_project_id" ON "cd_access" ("project_id");

ALTER TABLE cd_addon ADD COLUMN  project_id integer;
CREATE INDEX "index_addon_project_id" ON "cd_addon" ("project_id");

ALTER TABLE pi_pipeline ADD COLUMN  project_id integer;
CREATE INDEX "index_pipeline_project_id" ON "cd_pipeline" ("project_id");

ALTER TABLE pi_pipeline_group ADD COLUMN  project_id integer;
CREATE INDEX "index_pipeline_group_project_id" ON "cd_pipeline_group" ("project_id");

ALTER TABLE pi_storage ADD COLUMN  project_id integer;
CREATE INDEX "index_storage_project_id" ON "cd_storage" ("project_id");

ALTER TABLE pi_notification ADD COLUMN  project_id integer;
CREATE INDEX "index_notification_project_id" ON "cd_notification" ("project_id");

ALTER TABLE pi_history ADD COLUMN  project_id integer;
CREATE INDEX "index_history_project_id" ON "cd_history" ("project_id");

ALTER TABLE pi_history_log ADD COLUMN  project_id integer;
CREATE INDEX "index_history_log_project_id" ON "cd_history_log" ("project_id");


