-- 本地 ACME 服务的 EAB 凭证：用于限制谁能注册内部 ACME 账号
CREATE TABLE "cd_acme_eab"
(
  "id"                 varchar(32)  PRIMARY KEY NOT NULL,
  "ca_id"              integer      NOT NULL,
  "user_id"            integer      NOT NULL,
  "project_id"         integer,
  "name"               varchar(100) NOT NULL,
  "kid"                varchar(100) NOT NULL,
  "hmac_key_encrypted" text         NOT NULL,
  "hmac_key_hash"      varchar(64)  NOT NULL,
  "max_uses"           integer      NOT NULL DEFAULT 1,
  "used_count"         integer      NOT NULL DEFAULT 0,
  "allowed_domains"    text,
  "expires_time"       bigint,
  "disabled"           boolean      NOT NULL DEFAULT (0),
  "create_time"        datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"        datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX "index_acme_eab_kid" ON "cd_acme_eab" ("kid");
CREATE INDEX "index_acme_eab_ca" ON "cd_acme_eab" ("ca_id");

ALTER TABLE cd_acme_account ADD COLUMN eab_id varchar(32);
CREATE INDEX "index_acme_account_eab" ON "cd_acme_account" ("eab_id");
