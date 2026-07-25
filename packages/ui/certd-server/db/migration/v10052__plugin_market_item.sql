CREATE TABLE "pi_plugin_market_item"
(
  "id"             integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "app_id"         integer,
  "full_name"      varchar(200) NOT NULL,
  "author"         varchar(100),
  "name"           varchar(100),
  "plugin_type"    varchar(100),
  "title"          varchar(200),
  "icon"           varchar(200),
  "group"          varchar(100),
  "desc"           varchar(1000),
  "latest"         varchar(100),
  "status"         varchar(100),
  "download_count" integer,
  "sync_time"      integer,
  "create_time"    datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time"    datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX "index_plugin_market_item_full_name" ON "pi_plugin_market_item" ("full_name");
CREATE INDEX "index_plugin_market_item_plugin_type" ON "pi_plugin_market_item" ("plugin_type");
CREATE INDEX "index_plugin_market_item_group" ON "pi_plugin_market_item" ("group");
CREATE INDEX "index_plugin_market_item_sync_time" ON "pi_plugin_market_item" ("sync_time");
