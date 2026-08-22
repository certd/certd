ALTER TABLE "pi_plugin" ADD COLUMN "app_id" bigint;
ALTER TABLE "pi_plugin" ADD COLUMN "developer_id" bigint;
ALTER TABLE "pi_plugin" ADD COLUMN "full_name" varchar(191);
ALTER TABLE "pi_plugin" ADD COLUMN "latest" varchar(100);
ALTER TABLE "pi_plugin" ADD COLUMN "status" varchar(100);
ALTER TABLE "pi_plugin" ADD COLUMN "download_count" bigint;
ALTER TABLE "pi_plugin" ADD COLUMN "score" real;
ALTER TABLE "pi_plugin" ADD COLUMN "sync_time" bigint;

CREATE UNIQUE INDEX "index_plugin_full_name" ON "pi_plugin" ("full_name");
CREATE INDEX "index_plugin_plugin_type" ON "pi_plugin" ("pluginType");
CREATE INDEX "index_plugin_group" ON "pi_plugin" ("group");
CREATE INDEX "index_plugin_developer_id" ON "pi_plugin" ("developer_id");
CREATE INDEX "index_plugin_sync_time" ON "pi_plugin" ("sync_time");

UPDATE "pi_plugin" SET "type" = 'store' WHERE "type" = 'custom';
