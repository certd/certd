ALTER TABLE cd_trade ADD COLUMN rebate_amount integer NOT NULL DEFAULT 0;
ALTER TABLE cd_trade ADD COLUMN third_party_pay_amount integer NOT NULL DEFAULT 0;

CREATE TABLE "cd_invite_code"
(
  "id"          integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id"     integer,
  "code"        varchar(50),
  "disabled"    boolean  NOT NULL DEFAULT (false),
  "create_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX "index_invite_code_user_id" ON "cd_invite_code" ("user_id");
CREATE UNIQUE INDEX "index_invite_code_code" ON "cd_invite_code" ("code");

CREATE TABLE "cd_invite_relation"
(
  "id"              integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "inviter_user_id" integer,
  "invitee_user_id" integer,
  "invite_code"     varchar(50),
  "create_time"     datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"     datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX "index_invite_relation_inviter" ON "cd_invite_relation" ("inviter_user_id");
CREATE UNIQUE INDEX "index_invite_relation_invitee" ON "cd_invite_relation" ("invitee_user_id");

CREATE TABLE "cd_user_wallet"
(
  "id"                      integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id"                 integer,
  "available_amount"        integer NOT NULL DEFAULT 0,
  "frozen_amount"           integer NOT NULL DEFAULT 0,
  "total_income_amount"     integer NOT NULL DEFAULT 0,
  "total_consumed_amount"   integer NOT NULL DEFAULT 0,
  "total_withdraw_amount"   integer NOT NULL DEFAULT 0,
  "create_time"             datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"             datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX "index_user_wallet_user_id" ON "cd_user_wallet" ("user_id");

CREATE TABLE "cd_invite_commission_log"
(
  "id"              integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id"         integer,
  "amount"          integer,
  "trade_id"        integer,
  "invitee_user_id" integer,
  "consume_amount"  integer NOT NULL DEFAULT 0,
  "remark"          varchar(2048),
  "create_time"     datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"     datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX "index_invite_log_user_id" ON "cd_invite_commission_log" ("user_id");

CREATE TABLE "cd_user_wallet_log"
(
  "id"              integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id"         integer,
  "type"            varchar(50),
  "amount"          integer,
  "balance_after"   integer,
  "trade_id"        integer,
  "withdraw_id"     integer,
  "remark"          varchar(2048),
  "create_time"     datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"     datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX "index_user_wallet_log_user_id" ON "cd_user_wallet_log" ("user_id");

CREATE TABLE "cd_user_wallet_withdraw"
(
  "id"             integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id"        integer,
  "amount"         integer,
  "status"         varchar(50),
  "channel"        varchar(50),
  "real_name"      varchar(100),
  "account"        varchar(200),
  "bank_name"      varchar(200),
  "audit_user_id"  integer,
  "audit_remark"   varchar(2048),
  "audit_time"     integer,
  "create_time"    datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"    datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX "index_user_wallet_withdraw_user_id" ON "cd_user_wallet_withdraw" ("user_id");
CREATE INDEX "index_user_wallet_withdraw_status" ON "cd_user_wallet_withdraw" ("status");
