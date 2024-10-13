CREATE TABLE "pi_plugin"
(
  "id"          integer      NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name"        varchar(100) NOT NULL,
  "icon"        varchar(100),
  "title"       varchar(200),
  "desc"        varchar(500),
  "group"       varchar(100),
  "version"     varchar(100),
  "setting"     text,
  "sysSetting"  text,
  "content"     text,
  "type"        varchar(100) NOT NULL,
  "disabled"    boolean      NOT NULL,
  "create_time" datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "update_time" datetime     NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

