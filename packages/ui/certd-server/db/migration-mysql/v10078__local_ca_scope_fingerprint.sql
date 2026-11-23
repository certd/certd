ALTER TABLE cd_local_ca ADD COLUMN project_scope_id int GENERATED ALWAYS AS (COALESCE(project_id, 0)) STORED;
DROP INDEX index_local_ca_owner_fingerprint ON cd_local_ca;
CREATE INDEX `index_local_ca_owner_fingerprint` ON `cd_local_ca` (`user_id`, `project_scope_id`, `fingerprint_sha256`);
