ALTER TABLE cd_site_info ADD COLUMN ip_sync_auto boolean;
ALTER TABLE cd_site_info ADD COLUMN ip_sync_mode varchar(20);
ALTER TABLE cd_site_info ADD COLUMN ip_ignore_coherence boolean;

ALTER TABLE pi_pipeline ADD COLUMN webhook_key varchar(100);
ALTER TABLE pi_pipeline ADD COLUMN trigger_count bigint DEFAULT (0);

CREATE INDEX "index_pipeline_webhook_key" ON "pi_pipeline" ("webhook_key");
