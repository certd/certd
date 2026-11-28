ALTER TABLE sys_passkey ADD COLUMN last_used_at bigint;
ALTER TABLE sys_passkey ADD COLUMN "disabled" boolean NOT NULL DEFAULT false;
CREATE INDEX "index_passkey_user_disabled" ON "sys_passkey" ("user_id", "disabled");
