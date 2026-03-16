ALTER TABLE cd_access ADD COLUMN  key_id varchar(100) NULL;
CREATE INDEX "index_access_key_id" ON "cd_access" ("key_id");
update cd_access set key_id = id where key_id is null;

ALTER TABLE pi_notification ADD COLUMN  key_id varchar(100) NULL;
CREATE INDEX "index_notification_key_id" ON "pi_notification" ("key_id");
update pi_notification set key_id = id where key_id is null;


ALTER TABLE cd_addon ADD COLUMN  key_id varchar(100) NULL;
CREATE INDEX "index_addon_key_id" ON "cd_addon" ("key_id");
update cd_addon set key_id = id where key_id is null;
