-- 内置 ACME 服务端：账户、订单、授权、挑战
CREATE TABLE "cd_acme_account"
(
  "id"          varchar(32)  PRIMARY KEY NOT NULL,
  "ca_id"       integer      NOT NULL,
  "user_id"     integer      NOT NULL,
  "project_id"  integer,
  "jwk"         text         NOT NULL,
  "thumbprint"  varchar(64)  NOT NULL,
  "status"      varchar(20)  NOT NULL DEFAULT 'valid',
  "contact"     text,
  "create_time" datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time" datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX "index_acme_account_ca_thumbprint" ON "cd_acme_account" ("ca_id", "thumbprint");

CREATE TABLE "cd_acme_order"
(
  "id"             varchar(32) PRIMARY KEY NOT NULL,
  "ca_id"          integer     NOT NULL,
  "account_id"     varchar(32) NOT NULL,
  "status"         varchar(20) NOT NULL DEFAULT 'pending',
  "identifiers"    text        NOT NULL,
  "authz_ids"      text        NOT NULL,
  "csr"            text,
  "cert_pem"       text,
  "serial_number"  varchar(100),
  "error"          text,
  "expires_time"   bigint      NOT NULL,
  "create_time"    datetime    NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"    datetime    NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX "index_acme_order_account" ON "cd_acme_order" ("account_id");
CREATE INDEX "index_acme_order_ca" ON "cd_acme_order" ("ca_id");
CREATE INDEX "index_acme_order_serial" ON "cd_acme_order" ("serial_number");

CREATE TABLE "cd_acme_authz"
(
  "id"               varchar(32) PRIMARY KEY NOT NULL,
  "ca_id"            integer     NOT NULL,
  "order_id"         varchar(32) NOT NULL,
  "account_id"       varchar(32) NOT NULL,
  "identifier_type"  varchar(20) NOT NULL DEFAULT 'dns',
  "identifier_value" varchar(255) NOT NULL,
  "wildcard"         boolean     NOT NULL DEFAULT (0),
  "status"           varchar(20) NOT NULL DEFAULT 'pending',
  "expires_time"     bigint      NOT NULL,
  "create_time"      datetime    NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"      datetime    NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX "index_acme_authz_order" ON "cd_acme_authz" ("order_id");

CREATE TABLE "cd_acme_challenge"
(
  "id"                varchar(32)  PRIMARY KEY NOT NULL,
  "ca_id"             integer      NOT NULL,
  "order_id"          varchar(32)  NOT NULL,
  "authz_id"          varchar(32)  NOT NULL,
  "account_id"        varchar(32)  NOT NULL,
  "type"              varchar(20)  NOT NULL,
  "token"             varchar(255) NOT NULL,
  "key_authorization" varchar(255) NOT NULL,
  "status"            varchar(20)  NOT NULL DEFAULT 'pending',
  "error"             text,
  "validated_time"    bigint,
  "create_time"       datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"       datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX "index_acme_challenge_authz" ON "cd_acme_challenge" ("authz_id");
CREATE INDEX "index_acme_challenge_order" ON "cd_acme_challenge" ("order_id");
