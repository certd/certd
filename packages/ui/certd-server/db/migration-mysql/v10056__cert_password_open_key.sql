ALTER TABLE cd_cert_info ADD COLUMN cert_password longtext NULL;
ALTER TABLE cd_open_key ADD COLUMN return_cert_password boolean NOT NULL DEFAULT false;
