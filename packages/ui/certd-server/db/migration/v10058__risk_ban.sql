CREATE TABLE "cd_risk_ban"
(
  "id"           integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "target_type"  varchar(16) NOT NULL,
  "target_value" varchar(128) NOT NULL,
  "action"       varchar(16) NOT NULL,
  "scope"        varchar(16) NOT NULL,
  "reason"       text,
  "expires_at"   datetime,
  "enabled"      boolean NOT NULL DEFAULT 1,
  "create_time"  datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"  datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX "index_risk_ban_target" ON "cd_risk_ban" ("target_type", "target_value");
CREATE INDEX "index_risk_ban_action_scope" ON "cd_risk_ban" ("action", "scope", "enabled");
