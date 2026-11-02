CREATE TABLE "cd_user_login_ip"
(
  "user_id"    integer NOT NULL,
  "ip"         varchar(64) NOT NULL,
  "update_time" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY ("user_id", "ip")
);

CREATE INDEX "index_user_login_ip_ip" ON "cd_user_login_ip" ("ip");
