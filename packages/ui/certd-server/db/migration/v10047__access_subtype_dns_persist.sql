ALTER TABLE cd_access ADD COLUMN subtype varchar(100);
CREATE INDEX "index_access_subtype" ON "cd_access" ("subtype");

CREATE TABLE "cd_dns_persist_record"
(
  "id"                     integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id"                integer      NOT NULL,
  "project_id"             integer,
  "domain"                 varchar(255) NOT NULL,
  "main_domain"            varchar(255) NOT NULL,
  "ca_type"                varchar(50)  NOT NULL,
  "acme_account_access_id" integer      NOT NULL,
  "account_uri"            varchar(512) NOT NULL,
  "host_record"            varchar(255) NOT NULL,
  "record_value"           text         NOT NULL,
  "policy"                 varchar(50),
  "persist_until"          integer,
  "status"                 varchar(50)  NOT NULL DEFAULT 'pending',
  "dns_provider_type"      varchar(50),
  "dns_provider_access"    integer,
  "record_res"             text,
  "disabled"               integer      NOT NULL DEFAULT 0,
  "create_time"            datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"            datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX "index_dns_persist_user_id" ON "cd_dns_persist_record" ("user_id");
CREATE INDEX "index_dns_persist_project_id" ON "cd_dns_persist_record" ("project_id");
CREATE INDEX "index_dns_persist_domain" ON "cd_dns_persist_record" ("domain");
CREATE INDEX "index_dns_persist_main_domain" ON "cd_dns_persist_record" ("main_domain");
CREATE INDEX "index_dns_persist_account" ON "cd_dns_persist_record" ("acme_account_access_id");
