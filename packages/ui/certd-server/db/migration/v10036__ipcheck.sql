ALTER TABLE cd_site_info ADD COLUMN ip_scan boolean DEFAULT (0);

ALTER TABLE pi_pipeline ADD COLUMN webhook_key varchar(100);
ALTER TABLE pi_pipeline ADD COLUMN trigger_count integer DEFAULT (0);

CREATE INDEX "index_pipeline_webhook_key" ON "pi_pipeline" ("webhook_key");
