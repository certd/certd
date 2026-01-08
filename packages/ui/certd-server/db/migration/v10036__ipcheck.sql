ALTER TABLE cd_site_info ADD COLUMN ip_scan boolean DEFAULT (0);

ALTER TABLE pi_pipeline ADD COLUMN webhook_key varchar(100);

