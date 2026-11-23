DROP INDEX index_local_ca_owner_fingerprint;
CREATE INDEX "index_local_ca_owner_fingerprint" ON "cd_local_ca" ("user_id", "project_scope_id", "fingerprint_sha256");
