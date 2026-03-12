
CREATE TABLE "sys_passkey"
(
  "id"          integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id"     integer      NOT NULL,
  "device_name" varchar(512) NOT NULL,
  "passkey_id"  varchar(512) NOT NULL,
  "public_key"  varchar(1024) NOT NULL,
  "counter"     integer      NOT NULL,
  "transports"  varchar(512) NULL,
  "registered_at" integer      NOT NULL,
  "create_time" datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time" datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);


CREATE INDEX "index_passkey_user_id" ON "sys_passkey" ("user_id");
CREATE INDEX "index_passkey_passkey_id" ON "sys_passkey" ("passkey_id");
