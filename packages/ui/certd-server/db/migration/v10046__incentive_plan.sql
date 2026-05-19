ALTER TABLE cd_invite_commission_log ADD COLUMN level_id integer NOT NULL DEFAULT 0;
ALTER TABLE cd_invite_commission_log ADD COLUMN commission_rate integer NOT NULL DEFAULT 0;

CREATE TABLE "cd_invite_level"
(
  "id"              integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name"            varchar(100),
  "sort"            integer NOT NULL DEFAULT 0,
  "min_amount"      integer NOT NULL DEFAULT 0,
  "commission_rate" integer NOT NULL DEFAULT 0,
  "is_hidden"       boolean NOT NULL DEFAULT (false),
  "disabled"        boolean NOT NULL DEFAULT (false),
  "create_time"     datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"     datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX "index_invite_level_sort" ON "cd_invite_level" ("sort");

CREATE TABLE "cd_invite_user_plan"
(
  "id"             integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id"        integer,
  "enabled"        boolean NOT NULL DEFAULT (false),
  "level_id"       integer NOT NULL DEFAULT 0,
  "level_locked"   boolean NOT NULL DEFAULT (false),
  "agreement_time" integer NOT NULL DEFAULT 0,
  "create_time"    datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"    datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX "index_invite_user_plan_user_id" ON "cd_invite_user_plan" ("user_id");

INSERT INTO "cd_invite_level" ("name", "sort", "min_amount", "commission_rate", "is_hidden", "disabled")
VALUES ('青铜', 10, 0, 10, false, false),
       ('白银', 20, 100000, 15, false, false),
       ('黄金', 30, 500000, 20, false, false),
       ('钻石', 40, 1000000, 30, false, false);
