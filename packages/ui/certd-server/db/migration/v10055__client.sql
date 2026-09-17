
-- 客户端登记表：certd-client 心跳上报后记录在线状态；客户端自身信息保留独立列，站点统计等快照存 content JSON，后续扩展直接往 JSON 加字段。
CREATE TABLE "cd_client"
(
  "id"                integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id"           integer NOT NULL,
  "project_id"        integer,
  "client_id"         varchar(64) NOT NULL,
  "key_id"            varchar(64),
  "machine_name"      varchar(255),
  "version"           varchar(64),
  "os"                varchar(64),
  "content"           text,
  "last_heartbeat_at" integer NOT NULL,
  "create_time"       datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"       datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX "index_client_user_id" ON "cd_client" ("user_id");
CREATE INDEX "index_client_project_id" ON "cd_client" ("project_id");
CREATE UNIQUE INDEX "index_client_user_client" ON "cd_client" ("user_id", "client_id");
