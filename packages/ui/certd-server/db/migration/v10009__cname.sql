CREATE TABLE "cd_cname_provider"
(
  "id"                integer      NOT NULL PRIMARY KEY AUTOINCREMENT,
  "domain"            varchar(100) NOT NULL,
  "dns_provider_type" varchar(100) NOT NULL,
  "access_id"         integer      NOT NULL,
  "is_default"        boolean      NOT NULL,
  "remark"            varchar(200),
  "disabled"          boolean      NOT NULL,
  "create_time"       datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"       datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);


CREATE TABLE "cd_cname_record"
(
  "id"                integer      NOT NULL PRIMARY KEY AUTOINCREMENT,
  "user_id"           integer      NOT NULL,
  "domain"            varchar(100) NOT NULL,
  "host_record"       varchar(100) NOT NULL,
  "record_value"      varchar(200) NOT NULL,
  "cname_provider_id" integer      NOT NULL,
  "status"            varchar(100) NOT NULL,
  "create_time"       datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"       datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

